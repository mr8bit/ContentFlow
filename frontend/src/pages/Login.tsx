import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { LanguageToggle } from '../components/LanguageToggle';


export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError(t('auth.loginError'));
      }
    } catch (err) {
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Language Toggle - positioned absolutely */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">ContentFlow</CardTitle>
          <CardDescription>
            {t('auth.login')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !password}
            >
              {loading ? `${t('common.loading')}` : t('auth.loginButton')}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.noAccount', { defaultValue: 'No account?' })}{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary hover:underline"
              >
                {t('auth.register', { defaultValue: 'Register' })}
              </button>
            </p>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>{t('auth.defaultCredentials', { defaultValue: 'Default credentials:' })}</strong><br />
              {t('auth.username')}: admin<br />
              {t('auth.password')}: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}