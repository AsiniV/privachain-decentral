// UserCodesScreen.tsx - UI for managing OTC codes
//
// Displays current OTC codes and allows generation of new ones

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface OtcPair {
  code1: string;
  code2: string;
}

interface UserCodesScreenProps {
  onNavigateToRecovery?: () => void;
}

export function UserCodesScreen({ onNavigateToRecovery }: UserCodesScreenProps) {
  const [otcPair, setOtcPair] = useState<OtcPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCodes, setShowCodes] = useState<{ code1: boolean; code2: boolean }>({
    code1: false,
    code2: false,
  });

  // Simulate loading OTC pair from local storage/vault
  const loadOtcPair = async (): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call to load OTC pair
      // In real implementation, this would call the Rust messenger API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demonstration
      const mockPair: OtcPair = {
        code1: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        code2: "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
      };
      
      setOtcPair(mockPair);
    } catch (error) {
      toast.error('Failed to load OTC codes');
      console.error('Error loading OTC pair:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate new OTC pair
  const generateNewCodes = async (): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call to generate new OTC pair
      // In real implementation, this would call messenger::generate_otc_pair()
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock new codes
      const words = [
        'apple', 'banana', 'cherry', 'dog', 'elephant', 'forest', 'grape', 'house',
        'ice', 'jungle', 'kite', 'lemon', 'mountain', 'night', 'ocean', 'piano',
        'queen', 'river', 'sunset', 'tiger', 'umbrella', 'violet', 'water', 'yellow'
      ];
      
      const generateCode = () => {
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 12).join(' ');
      };
      
      const newPair: OtcPair = {
        code1: generateCode(),
        code2: generateCode()
      };
      
      setOtcPair(newPair);
      setShowCodes({ code1: false, code2: false });
      toast.success('New OTC codes generated successfully');
    } catch (error) {
      toast.error('Failed to generate new codes');
      console.error('Error generating new codes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Copy code to clipboard
  const copyToClipboard = async (code: string, codeNumber: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${codeNumber} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy code');
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Toggle code visibility
  const toggleCodeVisibility = (codeKey: 'code1' | 'code2'): void => {
    setShowCodes(prev => ({
      ...prev,
      [codeKey]: !prev[codeKey]
    }));
  };

  // Format code for display (hide if not shown)
  const formatCode = (code: string, isVisible: boolean): string => {
    if (!isVisible) {
      return '•'.repeat(code.length);
    }
    return code;
  };

  useEffect(() => {
    loadOtcPair();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            My Recovery Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Save these codes in a secure place. They are required to recover 
              access to premium features. Codes are stored only locally and are never 
              transmitted over the network.
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading codes...</span>
            </div>
          ) : otcPair ? (
            <div className="space-y-4">
              {/* Code 1 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Code 1:
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={formatCode(otcPair.code1, showCodes.code1)}
                    readOnly
                    className="font-mono text-sm flex-1"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCodeVisibility('code1')}
                  >
                    {showCodes.code1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(otcPair.code1, 1)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Code 2 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Code 2:
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={formatCode(otcPair.code2, showCodes.code2)}
                    readOnly
                    className="font-mono text-sm flex-1"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCodeVisibility('code2')}
                  >
                    {showCodes.code2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(otcPair.code2, 2)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  onClick={generateNewCodes}
                  disabled={loading}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Codes
                </Button>
                
                {onNavigateToRecovery && (
                  <Button 
                    variant="outline"
                    onClick={onNavigateToRecovery}
                    className="flex-1"
                  >
                    Restore Premium
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Recovery codes not found</p>
              <Button onClick={generateNewCodes} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Create Codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserCodesScreen;