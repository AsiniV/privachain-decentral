// RecoveryScreen.tsx - UI for premium recovery using OTC codes
//
// Allows users to input OTC codes to restore premium access via ZK proofs

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryScreenProps {
  onNavigateToUserCodes?: () => void;
  onRecoveryComplete?: () => void;
}

interface RecoveryState {
  step: 'input' | 'generating' | 'submitting' | 'complete' | 'error';
  progress: number;
  txHash?: string;
  error?: string;
}

export function RecoveryScreen({ onNavigateToUserCodes, onRecoveryComplete }: RecoveryScreenProps) {
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<RecoveryState>({
    step: 'input',
    progress: 0
  });

  // Validate OTC code format (12 words)
  const isValidCode = (inputCode: string): boolean => {
    const words = inputCode.trim().split(/\s+/);
    return words.length === 12 && words.every(word => word.length > 0);
  };

  // Simulate recovery process
  const processRecovery = async (): Promise<void> => {
    if (!isValidCode(code)) {
      toast.error('Введите корректный код из 12 слов');
      return;
    }

    try {
      // Step 1: Generate ZK proof
      setRecovery({ step: 'generating', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRecovery({ step: 'generating', progress: 30 });
      // Simulate proof generation
      // In real implementation: const proof = await ffi.generateRecoveryProof(code);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setRecovery({ step: 'generating', progress: 60 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Submit to blockchain
      setRecovery({ step: 'submitting', progress: 70 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRecovery({ step: 'submitting', progress: 85 });
      // Simulate blockchain transaction
      // In real implementation: const tx = await storeRecoveryProof(proof);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Complete
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}...`;
      setRecovery({ 
        step: 'complete', 
        progress: 100,
        txHash: mockTxHash 
      });
      
      toast.success('Премиум доступ восстановлен!');
      
      // Auto-navigate after delay
      setTimeout(() => {
        if (onRecoveryComplete) {
          onRecoveryComplete();
        } else if (onNavigateToUserCodes) {
          onNavigateToUserCodes();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Recovery failed:', error);
      setRecovery({ 
        step: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
      toast.error('Ошибка восстановления');
    }
  };

  // Reset recovery state
  const resetRecovery = (): void => {
    setRecovery({ step: 'input', progress: 0 });
    setCode('');
  };

  const getStepDescription = (): string => {
    switch (recovery.step) {
      case 'generating':
        return 'Генерация доказательства с нулевым разглашением...';
      case 'submitting':
        return 'Отправка транзакции в блокчейн...';
      case 'complete':
        return 'Премиум доступ успешно восстановлен!';
      case 'error':
        return `Ошибка: ${recovery.error}`;
      default:
        return '';
    }
  };

  const isProcessing = recovery.step === 'generating' || recovery.step === 'submitting';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Восстановить премиум доступ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Введите любой из ваших кодов восстановления для восстановления премиум доступа. 
              Код будет обработан локально, и в блокчейн будет отправлено только 
              криптографическое доказательство без раскрытия самого кода.
            </AlertDescription>
          </Alert>

          {recovery.step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Код восстановления:
                </label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Введите любой из ваших кодов из 12 слов"
                  className="font-mono text-sm min-h-[100px]"
                  disabled={isProcessing}
                />
                <p className="text-xs text-gray-500">
                  Введите 12 слов, разделённых пробелами
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={processRecovery}
                  disabled={!isValidCode(code) || isProcessing}
                  className="flex-1"
                >
                  Восстановить
                </Button>
                
                {onNavigateToUserCodes && (
                  <Button 
                    variant="outline"
                    onClick={onNavigateToUserCodes}
                    className="flex-1"
                  >
                    Мои коды
                  </Button>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {getStepDescription()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {recovery.progress}%
                  </span>
                </div>
                <Progress value={recovery.progress} className="w-full" />
              </div>
              
              <div className="flex justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            </div>
          )}

          {recovery.step === 'complete' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-700">
                  Восстановление завершено!
                </h3>
                <p className="text-sm text-gray-600">
                  {getStepDescription()}
                </p>
                {recovery.txHash && (
                  <p className="text-xs text-gray-500 font-mono">
                    TX: {recovery.txHash}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {onNavigateToUserCodes && (
                  <Button 
                    onClick={onNavigateToUserCodes}
                    className="flex-1"
                  >
                    Мои коды
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={resetRecovery}
                  className="flex-1"
                >
                  Восстановить ещё раз
                </Button>
              </div>
            </div>
          )}

          {recovery.step === 'error' && (
            <div className="space-y-4 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-red-700">
                  Ошибка восстановления
                </h3>
                <p className="text-sm text-gray-600">
                  {getStepDescription()}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={resetRecovery}
                  className="flex-1"
                >
                  Попробовать снова
                </Button>
                
                {onNavigateToUserCodes && (
                  <Button 
                    variant="outline"
                    onClick={onNavigateToUserCodes}
                    className="flex-1"
                  >
                    Мои коды
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RecoveryScreen;