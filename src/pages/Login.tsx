import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/state/authStore';
import { SafeUser } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, User, Loader2, Store, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore((state) => ({
    setUser: state.setUser,
    setToken: state.setToken,
  }));

  // Foca no campo de usuário ao carregar
  useEffect(() => {
    const usernameInput = document.getElementById('username');
    usernameInput?.focus();
  }, []);

  // Limpa erro quando o usuário começa a digitar
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [username, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validação básica
    if (!username.trim()) {
      setError('Por favor, informe o usuário');
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Por favor, informe a senha');
      setIsLoading(false);
      return;
    }

    try {
      const user = await invoke<SafeUser>('login', { username, password });
      
      // Gera um token simples baseado em timestamp e dados do usuário
      const token = btoa(JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        timestamp: Date.now(),
      }));
      
      // Armazena token no sessionStorage (será destruído ao fechar a janela)
      sessionStorage.setItem('auth-token', token);
      
      // Atualiza o store com user e token
      setUser(user);
      setToken(token);
      
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage.includes('Invalid credentials') || errorMessage.includes('credenciais')
        ? 'Usuário ou senha incorretos'
        : 'Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin(e as any);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Store className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">S.G.D.</h1>
          <p className="text-muted-foreground text-sm">Sistema de Gestão de Distribuidora</p>
          <p className="text-muted-foreground">
            Faça login para acessar o sistema
          </p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-lg border-2">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Campo Usuário */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="pl-9 h-11"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="pl-9 pr-10 h-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <Alert variant="destructive" className="animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão de Login */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading || !username.trim() || !password.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            {/* Informações adicionais */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                Seu login será válido apenas enquanto a janela estiver aberta
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          S.G.D. - Sistema de Gestão de Distribuidora
        </p>
      </div>
    </div>
  );
}
