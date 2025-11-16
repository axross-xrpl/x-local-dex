import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isWalletConnected, getCurrentWalletAddress } from '@repo/utils/wallet/browser';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  address: string | null;
  login: (address: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // Set a hard timeout - if not done in 3 seconds, assume not connected
      const timeoutId = setTimeout(() => {
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }, 5000);

      try {
        
        const connected = await isWalletConnected();
        
        if (!mounted) return;
        
        if (connected) {
          const walletAddress = await getCurrentWalletAddress();
          
          if (!mounted) return;
          
          if (walletAddress) {
            clearTimeout(timeoutId);
            setAddress(walletAddress);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }
        
        clearTimeout(timeoutId);
        setIsAuthenticated(false);
        setIsLoading(false);
      } catch (error) {
        console.error('[AuthContext] Auth check failed:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = (walletAddress: string) => {
    setAddress(walletAddress);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setAddress(null);
    setIsAuthenticated(false);
    localStorage.removeItem('xumm-sdk-jwt');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, address, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};