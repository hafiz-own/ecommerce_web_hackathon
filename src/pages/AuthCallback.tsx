import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Authentication failed: ${error}`);
      navigate('/signin');
      return;
    }

    if (token) {
      localStorage.setItem('auth_token', token);
      toast.success('Successfully signed in!');
      navigate('/');
    } else {
      // No token and no error, redirect to sign in
      navigate('/signin');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-12 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="font-body text-muted-foreground">Completing sign in...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
