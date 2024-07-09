import { useState } from 'react';
import { useRouter } from 'next/router';
import { PasswordForm } from '../components/UI';
import MainApp from '../components/MainApp';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleAuthentication = (password: string) => {
    // Here you would typically validate the password against a secure backend
    // For demonstration purposes, we're using a simple check
    if (password === 'blue') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  if (!isAuthenticated) {
    return <PasswordForm onSubmit={handleAuthentication} />;
  }

  return <MainApp />;
}
