import { useState } from 'react';
import { CredentialAccept  } from '@repo/ui';
import type { CredentialAcceptData } from '@repo/ui';
import type { WalletState } from '@repo/utils/wallet/core';

function CredentialPage() {
  const handleCredentialAccepted = (txHash: string, data: any) => {
    console.log('Credential accepted:', txHash, data);
  };

  return (
    <div>
      <h1>Accept Credential</h1>
      <CredentialAccept onCredentialAccepted={handleCredentialAccepted} />
    </div>
  );
}

export default CredentialPage;