import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type LoginState = {
  from?: {
    pathname: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isLoading, login } = useAuth();
  const state = location.state as LoginState | null;
  const returnPath = state?.from?.pathname ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoggedIn) {
    return <Navigate to={returnPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(returnPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました。';
      setSubmitError(`ログインに失敗しました: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="detail-wrapper auth-wrapper">
      <h1>管理者ログイン</h1>
      {isLoading ? <p>セッション確認中です...</p> : null}
      <form className="card shop-form" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {submitError ? <p className="form-error form-error-summary">{submitError}</p> : null}

        <div className="shop-form-actions">
          <button type="submit" className="button-primary" disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>
      </form>
    </section>
  );
}
