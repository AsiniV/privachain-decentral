import { EncodeObject } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { sponsorAndBroadcast } from './sponsor';

export async function sendWithSponsor(
  client: SigningStargateClient,
  sender: string,
  recipient: string,
  amount: { denom: string; amount: string }[],
  memo = ''
) {
  const msgs: EncodeObject[] = [{
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: { fromAddress: sender, toAddress: recipient, amount },
  }];

  // 1. sign WITHOUT fee (gas-payer = "")
  const txRaw = await client.sign(sender, msgs, { amount: [], gas: '200000' }, memo);
  // 2. server adds fee and broadcasts
  return sponsorAndBroadcast(txRaw);
}
