'use client';

import { useState, FormEvent } from 'react';
import { Cloud, HardDrive, Server, Database, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        router.push('/dashboard');
      } else {
        setError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-6 bg-background text-foreground font-sans">
      {/* 背景装饰光晕 */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/6 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      {/* 主容器：左右两栏 */}
      <div
        className="relative z-10 w-full max-w-5xl flex rounded-2xl overflow-hidden shadow-dialog"
        style={{ minHeight: '540px' }}
      >
        {/* 左侧：品牌信息区 */}
        <div
          className="flex-1 flex flex-col justify-center px-12 py-10 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(124,92,255,0.12) 0%, rgba(105,231,255,0.06) 100%)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* 品牌Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">CloudOps</span>
          </div>

          {/* Slogan */}
          <h1 className="text-3xl font-bold leading-snug text-foreground mb-3">
            小团队的一体化<br />云运维平台
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-10">
            云盘存储 · 服务器管理 · 存储节点，一站式解决运维需求
          </p>

          {/* 功能亮点 */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <HardDrive className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">云盘存储</h3>
                <p className="text-xs text-muted-foreground mt-0.5">安全可靠的文件存储与共享，支持多端同步</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">服务器管理</h3>
                <p className="text-xs text-muted-foreground mt-0.5">实时监控与运维，一站式管理所有服务器实例</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">存储节点</h3>
                <p className="text-xs text-muted-foreground mt-0.5">分布式节点部署与调度，弹性扩缩容</p>
              </div>
            </div>
          </div>

          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        {/* 右侧：登录表单卡片 */}
        <div
          className="w-[420px] shrink-0 flex flex-col justify-center px-10 py-10"
          style={{
            background: 'rgba(15,20,32,0.75)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2 className="text-xl font-bold text-foreground mb-1">欢迎回来</h2>
          <p className="text-sm text-muted-foreground mb-8">登录 CloudOps 以继续</p>

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* 用户名 */}
            <div className="mb-5">
              <label htmlFor="input-username" className="block text-sm font-medium text-foreground mb-1.5">
                用户名
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted border-none rounded-lg pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="mb-5">
              <label htmlFor="input-password" className="block text-sm font-medium text-foreground mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border-none rounded-lg pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* 记住登录 */}
            <div className="flex items-center justify-between mb-8">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-muted-foreground">记住登录</span>
              </label>
              <span className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                忘记密码？
              </span>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #9B82FF 100%)' }}
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          {/* 注册入口 */}
          <p className="text-sm text-muted-foreground text-center mt-6">
            没有账号？
            <button
              onClick={() => router.push('/register')}
              className="text-primary hover:text-primary/80 hover:underline ml-1 transition-colors"
            >
              立即注册
            </button>
          </p>

          {/* 底部提示 */}
          <p className="text-xs text-muted-foreground/50 text-center mt-3">
            登录即表示同意{' '}
            <span className="text-primary/70 hover:text-primary transition-colors cursor-pointer">服务条款</span>
            {' '}和{' '}
            <span className="text-primary/70 hover:text-primary transition-colors cursor-pointer">隐私政策</span>
          </p>
        </div>
      </div>
    </main>
  );
}
