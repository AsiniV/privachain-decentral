// OtcManager.tsx - Main OTC management component
//
// Manages navigation between user codes and recovery screens

import React, { useState } from 'react';
import UserCodesScreen from './UserCodesScreen';
import RecoveryScreen from './RecoveryScreen';

type Screen = 'codes' | 'recovery';

export function OtcManager() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('codes');

  const navigateToRecovery = () => {
    setCurrentScreen('recovery');
  };

  const navigateToUserCodes = () => {
    setCurrentScreen('codes');
  };

  const handleRecoveryComplete = () => {
    // After successful recovery, go back to codes screen
    // and potentially refresh the codes
    setCurrentScreen('codes');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === 'codes' && (
        <UserCodesScreen onNavigateToRecovery={navigateToRecovery} />
      )}
      
      {currentScreen === 'recovery' && (
        <RecoveryScreen 
          onNavigateToUserCodes={navigateToUserCodes}
          onRecoveryComplete={handleRecoveryComplete}
        />
      )}
    </div>
  );
}

export default OtcManager;