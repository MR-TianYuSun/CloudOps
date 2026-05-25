import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// GET /api/documents/[id]/collaborators - Get active collaborators for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '令牌无效' }, { status: 401 });
  }

  // Access the collaboration room members map set by server.ts
  const globalWithCollab = globalThis as Record<string, unknown>;
  const collabRoomMembers = globalWithCollab.__collabRoomMembers as
    | Map<string, Array<{ userId: number; username: string; displayName: string; joinedAt: number }>>
    | undefined;

  const docId = String(id);
  const collaborators = collabRoomMembers?.get(docId) || [];

  return NextResponse.json({
    success: true,
    data: collaborators,
  });
}
