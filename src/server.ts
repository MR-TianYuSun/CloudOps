import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { verifyToken } from './lib/auth';
import { getDb } from './lib/db';
import { Client as SSHClient, type ConnectConfig } from 'ssh2';
import * as net from 'net';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // WebSocket server for SSH terminal
  const wssTerminal = new WebSocketServer({ noServer: true });
  // WebSocket server for VNC remote desktop
  const wssVnc = new WebSocketServer({ noServer: true });
  // WebSocket server for document collaboration
  const wssCollab = new WebSocketServer({ noServer: true });

  // ============ SSH Terminal Handler ============
  wssTerminal.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const serverId = url.searchParams.get('serverId');

    if (!token || !serverId) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Missing token or serverId' }));
      ws.close();
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Authentication failed' }));
      ws.close();
      return;
    }

    // Get server info from DB
    const db = getDb();
    const srv = db.prepare('SELECT * FROM servers WHERE id = ?').get(Number(serverId)) as Record<string, unknown> | undefined;
    if (!srv) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Server not found' }));
      ws.close();
      return;
    }

    // Parse SSH connection info
    const host = String(srv.ip_address || srv.host || '').split(':')[0];
    const portNum = Number(srv.ssh_port || srv.port || 22);
    const username = String(srv.ssh_user || srv.username || 'root');

    if (!host) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Invalid server address' }));
      ws.close();
      return;
    }

    // Connect via SSH
    const sshClient = new SSHClient();

    sshClient.on('ready', () => {
      // Update server status to online
      try {
        const db2 = getDb();
        db2.prepare("UPDATE servers SET status = 'online', updated_at = datetime('now') WHERE id = ?").run(Number(serverId));
      } catch { /* ignore */ }

      ws.send(JSON.stringify({ type: 'connected', payload: `Connected to ${username}@${host}` }));

      sshClient.shell(
        {
          term: 'xterm-256color',
          cols: 80,
          rows: 24,
        },
        (err, stream) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', payload: `Shell error: ${err.message}` }));
            ws.close();
            return;
          }

          // SSH output -> WebSocket
          stream.on('data', (data: Buffer) => {
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: 'output', payload: data.toString('base64') }));
            }
          });

          stream.stderr.on('data', (data: Buffer) => {
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: 'output', payload: data.toString('base64') }));
            }
          });

          stream.on('close', () => {
            ws.send(JSON.stringify({ type: 'disconnected', payload: 'Connection closed' }));
            ws.close();
          });

          // WebSocket -> SSH input
          ws.on('message', (raw: unknown) => {
            try {
              const msg = JSON.parse(String(raw));
              if (msg.type === 'input' && msg.payload) {
                const data = Buffer.from(msg.payload, 'base64');
                stream.write(data);
              } else if (msg.type === 'resize' && msg.payload) {
                stream.setWindow(
                  msg.payload.rows || 24,
                  msg.payload.cols || 80,
                  0,
                  0
                );
              } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', payload: null }));
              }
            } catch {
              // ignore parse errors
            }
          });

          // Cleanup on WebSocket close
          ws.on('close', () => {
            stream.close();
            sshClient.end();
          });
        }
      );
    });

    sshClient.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', payload: `SSH connection failed: ${err.message}` }));
      ws.close();
    });

    sshClient.on('close', () => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'disconnected', payload: 'SSH connection closed' }));
        ws.close();
      }
    });

    // Try to connect with password or key
    const sshConfig: ConnectConfig = {
      host,
      port: portNum,
      username,
      readyTimeout: 10000,
    };

    // Use password if available
    const password = String(srv.ssh_password || srv.password || '');
    if (password) {
      sshConfig.password = password;
    }

    // Use private key if available
    const privateKey = String(srv.ssh_key || srv.private_key || '');
    if (privateKey) {
      sshConfig.privateKey = privateKey;
    }

    // If neither, try default key
    if (!password && !privateKey) {
      sshConfig.password = '';
    }

    try {
      sshClient.connect(sshConfig);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', payload: `SSH connect error: ${(err as Error).message}` }));
      ws.close();
    }
  });

  // ============ VNC Remote Desktop Handler (websockify proxy) ============
  wssVnc.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const serverId = url.searchParams.get('serverId');

    if (!token || !serverId) {
      ws.close(4001, 'Missing token or serverId');
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.close(4003, 'Authentication failed');
      return;
    }

    // Get server info from DB
    const db = getDb();
    const srv = db.prepare('SELECT * FROM servers WHERE id = ?').get(Number(serverId)) as Record<string, unknown> | undefined;
    if (!srv) {
      ws.close(4004, 'Server not found');
      return;
    }

    const host = String(srv.ip_address || srv.host || '').split(':')[0];
    const vncPort = Number(srv.vnc_port || 5900);

    if (!host) {
      ws.close(4005, 'Invalid server address');
      return;
    }

    // Create TCP connection to VNC server
    const vncSocket = net.createConnection({ host, port: vncPort }, () => {
      console.log(`VNC proxy: connected to ${host}:${vncPort}`);
      // Update server status to online
      try {
        const db2 = getDb();
        db2.prepare("UPDATE servers SET status = 'online', updated_at = datetime('now') WHERE id = ?").run(Number(serverId));
      } catch { /* ignore */ }
    });

    vncSocket.on('data', (data: Buffer) => {
      // Forward VNC server data to WebSocket as binary
      if (ws.readyState === 1) {
        ws.send(data);
      }
    });

    vncSocket.on('close', () => {
      if (ws.readyState === 1) {
        ws.close();
      }
    });

    vncSocket.on('error', (err) => {
      console.error(`VNC proxy error: ${err.message}`);
      if (ws.readyState === 1) {
        ws.close(1011, `VNC connection failed: ${err.message}`);
      }
    });

    // Forward WebSocket data to VNC server
    ws.on('message', (data: unknown) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
      if (vncSocket.writable) {
        vncSocket.write(buffer);
      }
    });

    ws.on('close', () => {
      vncSocket.destroy();
    });
  });

  // ============ Document Collaboration Handler ============
  const collabRooms = new Map<string, Set<import('ws').WebSocket>>();
  const collabDocs = new Map<string, { version: number; snapshots: unknown[] }>();

  // Expose collaboration room info via globalThis so API routes can access it
  const collabRoomMembers = new Map<string, Array<{ userId: number; username: string; displayName: string; joinedAt: number }>>();
  (globalThis as Record<string, unknown>).__collabRoomMembers = collabRoomMembers;

  function getCollabKey(docId: string): string {
    return `doc:${docId}`;
  }

  function broadcastToRoom(docId: string, message: Record<string, unknown>, excludeWs?: import('ws').WebSocket) {
    const key = getCollabKey(docId);
    const room = collabRooms.get(key);
    if (!room) return;
    const data = JSON.stringify(message);
    for (const client of room) {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(data);
      }
    }
  }

  wssCollab.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const docId = url.searchParams.get('docId');

    if (!token || !docId) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Missing token or docId' }));
      ws.close();
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Authentication failed' }));
      ws.close();
      return;
    }

    const userId = (payload as unknown as Record<string, unknown>).userId as number;
    const username = (payload as unknown as Record<string, unknown>).username as string;
    const key = getCollabKey(docId);

    // Join room
    if (!collabRooms.has(key)) {
      collabRooms.set(key, new Set());
    }
    collabRooms.get(key)!.add(ws);

    // Initialize document version if needed
    if (!collabDocs.has(key)) {
      collabDocs.set(key, { version: 0, snapshots: [] });
    }

    // Send join notification
    ws.send(JSON.stringify({
      type: 'collab:joined',
      payload: {
        docId,
        userId,
        username,
        version: collabDocs.get(key)!.version,
        members: Array.from(collabRooms.get(key)!).map((c) => (c as unknown as Record<string, unknown>).__collabUser).filter(Boolean),
      }
    }));

    // Notify others
    broadcastToRoom(docId, {
      type: 'collab:peer:join',
      payload: { userId, username },
    }, ws);

    // Tag connection with user info
    (ws as unknown as Record<string, unknown>).__collabUser = { userId, username };

    // Update room members map for API access
    const memberInfo = { userId, username, displayName: username, joinedAt: Date.now() };
    if (!collabRoomMembers.has(docId)) {
      collabRoomMembers.set(docId, []);
    }
    collabRoomMembers.get(docId)!.push(memberInfo);
    // Also store memberInfo on the ws for removal later
    (ws as unknown as Record<string, unknown>).__collabMemberInfo = { docId, memberInfo };

    ws.on('message', (raw: unknown) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', payload: null }));
          return;
        }

        const docState = collabDocs.get(key);
        if (!docState) return;

        switch (msg.type) {
          case 'collab:op': {
            // OT operation: broadcast to all peers
            docState.version++;
            broadcastToRoom(docId, {
              type: 'collab:op',
              payload: {
                ...msg.payload,
                version: docState.version,
                userId,
                username,
              },
            }, ws);
            break;
          }
          case 'collab:cursor': {
            // Cursor position broadcast
            broadcastToRoom(docId, {
              type: 'collab:cursor',
              payload: { ...msg.payload, userId, username },
            }, ws);
            break;
          }
          case 'collab:selection': {
            // Selection range broadcast
            broadcastToRoom(docId, {
              type: 'collab:selection',
              payload: { ...msg.payload, userId, username },
            }, ws);
            break;
          }
          case 'collab:save': {
            // Acknowledge save
            broadcastToRoom(docId, {
              type: 'collab:save:ack',
              payload: { userId, username, version: docState.version },
            });
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('close', () => {
      const room = collabRooms.get(key);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          collabRooms.delete(key);
          collabDocs.delete(key);
          collabRoomMembers.delete(docId);
        } else {
          broadcastToRoom(docId, {
            type: 'collab:peer:leave',
            payload: { userId, username },
          });
        }
      }
      // Remove from room members map
      const memberInfo = (ws as unknown as Record<string, unknown>).__collabMemberInfo as { docId: string; memberInfo: { userId: number } } | undefined;
      if (memberInfo) {
        const members = collabRoomMembers.get(memberInfo.docId);
        if (members) {
          const idx = members.findIndex(m => m.userId === memberInfo.memberInfo.userId);
          if (idx !== -1) members.splice(idx, 1);
          if (members.length === 0) collabRoomMembers.delete(memberInfo.docId);
        }
      }
    });
  });

  // Handle HTTP upgrade for WebSocket
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url!, true);

    if (pathname === '/ws/terminal') {
      wssTerminal.handleUpgrade(req, socket, head, (ws) => {
        wssTerminal.emit('connection', ws, req);
      });
    } else if (pathname === '/ws/vnc') {
      wssVnc.handleUpgrade(req, socket, head, (ws) => {
        wssVnc.emit('connection', ws, req);
      });
    } else if (pathname === '/ws/collab') {
      wssCollab.handleUpgrade(req, socket, head, (ws) => {
        wssCollab.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`
    );
  });
});
