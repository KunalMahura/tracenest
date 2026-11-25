import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell, { Field, FormError } from '../components/AuthShell';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/projects?new=1');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const barColor = (i) => {
    if (strength < i) return 'bg-ink/10';
    return strength === 1 ? 'bg-vermilion-500' : 'bg-teal-400';
  };

  return (
    <AuthShell
      title={<>Start <span className="italic">catching.</span></>}
      subtitle="Free for 10,000 logs a day per project. No card needed."
      footer={<>Already have an account? <Link to="/login" className="text-ink font-semibold underline decoration-vermilion-500 decoration-2 underline-offset-4">Sign in</Link></>}
    >
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="register-name" label="Name" type="text" icon={User} value={name}
          onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Ada Lovelace" autoComplete="name" />
        <Field id="register-email" label="Email" type="email" icon={Mail} value={email}
          onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" autoComplete="email" />
        <div>
          <Field id="register-password" label="Password" hint="8+ characters" type="password" icon={Lock} value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
          <div className="flex gap-1 mt-2" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${barColor(i)}`} />
            ))}
          </div>
        </div>
        <button id="register-submit" type="submit" disabled={loading} className="btn-primary w-full !py-3 mt-2 cursor-pointer">
          {loading ? 'Creating account…' : 'Create account'} <ArrowRight size={15} />
        </button>
      </form>
    </AuthShell>
  );
}
