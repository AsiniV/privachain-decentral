/**
 * PRIV Token Implementation
 * Native cryptocurrency for PrivaChain ecosystem
 */

export interface TokenBalance {
  address: string;
  balance: bigint;
  lockedStake: bigint;
  pendingRewards: bigint;
}

export interface TokenTransfer {
  id: string;
  from: string;
  to: string;
  amount: bigint;
  fee: bigint;
  timestamp: number;
  type: 'transfer' | 'stake' | 'reward' | 'fee';
  metadata?: string;
}

export interface StakingPosition {
  validator: string;
  staker: string;
  amount: bigint;
  startTime: number;
  endTime?: number;
  rewards: bigint;
}

export class PRIVToken {
  private balances: Map<string, TokenBalance> = new Map();
  private transfers: TokenTransfer[] = [];
  private stakingPositions: Map<string, StakingPosition> = new Map();
  private totalSupply = BigInt('1000000000000000000000000000'); // 1 billion PRIV
  private circulatingSupply = BigInt('100000000000000000000000000'); // 100 million initial circulation
  
  // Token economics constants
  private readonly decimals = 18;
  private readonly stakingRewardRate = 0.08; // 8% annual
  private readonly validatorCommission = 0.05; // 5% commission
  private readonly minStakeAmount = BigInt('1000000000000000000000'); // 1000 PRIV minimum

  constructor() {
    this.initializeTokenomics();
  }

  private initializeTokenomics(): void {
    // Initialize foundation wallet
    const foundationWallet = '0x0000000000000000000000000000000000000001';
    this.balances.set(foundationWallet, {
      address: foundationWallet,
      balance: this.circulatingSupply,
      lockedStake: BigInt(0),
      pendingRewards: BigInt(0)
    });
  }

  /**
   * Get token balance for address
   */
  getBalance(address: string): TokenBalance {
    return this.balances.get(address) || {
      address,
      balance: BigInt(0),
      lockedStake: BigInt(0),
      pendingRewards: BigInt(0)
    };
  }

  /**
   * Transfer PRIV tokens
   */
  async transfer(
    from: string,
    to: string,
    amount: bigint,
    fee: bigint = BigInt('1000000000000000') // 0.001 PRIV default fee
  ): Promise<string> {
    const fromBalance = this.getBalance(from);
    const totalCost = amount + fee;

    if (fromBalance.balance < totalCost) {
      throw new Error('Insufficient balance');
    }

    // Create transfer record
    const transfer: TokenTransfer = {
      id: this.generateTransferId(),
      from,
      to,
      amount,
      fee,
      timestamp: Date.now(),
      type: 'transfer'
    };

    // Update balances
    fromBalance.balance -= totalCost;
    
    const toBalance = this.getBalance(to);
    toBalance.balance += amount;

    // Update maps
    this.balances.set(from, fromBalance);
    this.balances.set(to, toBalance);
    this.transfers.push(transfer);

    return transfer.id;
  }

  /**
   * Stake PRIV tokens to a validator
   */
  async stake(
    staker: string,
    validator: string,
    amount: bigint
  ): Promise<string> {
    if (amount < this.minStakeAmount) {
      throw new Error('Amount below minimum stake');
    }

    const stakerBalance = this.getBalance(staker);
    if (stakerBalance.balance < amount) {
      throw new Error('Insufficient balance for staking');
    }

    // Lock tokens
    stakerBalance.balance -= amount;
    stakerBalance.lockedStake += amount;

    // Create staking position
    const positionId = this.generateStakeId(staker, validator);
    const position: StakingPosition = {
      validator,
      staker,
      amount,
      startTime: Date.now(),
      rewards: BigInt(0)
    };

    this.stakingPositions.set(positionId, position);
    this.balances.set(staker, stakerBalance);

    // Record stake transaction
    const stakeTransfer: TokenTransfer = {
      id: this.generateTransferId(),
      from: staker,
      to: validator,
      amount,
      fee: BigInt(0),
      timestamp: Date.now(),
      type: 'stake',
      metadata: positionId
    };

    this.transfers.push(stakeTransfer);
    return positionId;
  }

  /**
   * Unstake PRIV tokens
   */
  async unstake(positionId: string): Promise<boolean> {
    const position = this.stakingPositions.get(positionId);
    if (!position) {
      throw new Error('Staking position not found');
    }

    // Calculate rewards
    const rewards = this.calculateStakingRewards(position);
    const totalReturn = position.amount + rewards;

    // Update staker balance
    const stakerBalance = this.getBalance(position.staker);
    stakerBalance.balance += totalReturn;
    stakerBalance.lockedStake -= position.amount;

    // Mark position as ended
    position.endTime = Date.now();
    position.rewards = rewards;

    this.balances.set(position.staker, stakerBalance);
    this.stakingPositions.set(positionId, position);

    return true;
  }

  /**
   * Calculate staking rewards
   */
  private calculateStakingRewards(position: StakingPosition): bigint {
    const stakingDuration = Date.now() - position.startTime;
    const stakingDays = stakingDuration / (1000 * 60 * 60 * 24);
    const annualReward = Number(position.amount) * this.stakingRewardRate;
    const dailyReward = annualReward / 365;
    const totalReward = dailyReward * stakingDays;

    return BigInt(Math.floor(totalReward));
  }

  /**
   * Distribute rewards to validators and stakers
   */
  async distributeRewards(validatorAddress: string, blockReward: bigint): Promise<void> {
    // Validator commission
    const validatorCommission = BigInt(Math.floor(Number(blockReward) * this.validatorCommission));
    const stakerRewards = blockReward - validatorCommission;

    // Distribute to validator
    const validatorBalance = this.getBalance(validatorAddress);
    validatorBalance.balance += validatorCommission;
    this.balances.set(validatorAddress, validatorBalance);

    // Find all stakers for this validator
    const validatorStakers = Array.from(this.stakingPositions.values())
      .filter(pos => pos.validator === validatorAddress && !pos.endTime);

    const totalStaked = validatorStakers.reduce((sum, pos) => sum + pos.amount, BigInt(0));

    if (totalStaked > 0) {
      // Distribute proportional rewards to stakers
      for (const position of validatorStakers) {
        const stakerReward = (stakerRewards * position.amount) / totalStaked;
        const stakerBalance = this.getBalance(position.staker);
        stakerBalance.pendingRewards += stakerReward;
        this.balances.set(position.staker, stakerBalance);
      }
    }
  }

  /**
   * Claim pending rewards
   */
  async claimRewards(address: string): Promise<bigint> {
    const balance = this.getBalance(address);
    const rewards = balance.pendingRewards;
    
    if (rewards > 0) {
      balance.balance += rewards;
      balance.pendingRewards = BigInt(0);
      this.balances.set(address, balance);

      // Record reward claim
      const rewardTransfer: TokenTransfer = {
        id: this.generateTransferId(),
        from: 'rewards',
        to: address,
        amount: rewards,
        fee: BigInt(0),
        timestamp: Date.now(),
        type: 'reward'
      };
      this.transfers.push(rewardTransfer);
    }

    return rewards;
  }

  /**
   * Get staking positions for an address
   */
  getStakingPositions(address: string): StakingPosition[] {
    return Array.from(this.stakingPositions.values())
      .filter(pos => pos.staker === address);
  }

  /**
   * Get token transfer history
   */
  getTransferHistory(address: string, limit: number = 50): TokenTransfer[] {
    return this.transfers
      .filter(transfer => transfer.from === address || transfer.to === address)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    const totalLocked = Array.from(this.balances.values())
      .reduce((sum, balance) => sum + balance.lockedStake, BigInt(0));
    
    const totalPendingRewards = Array.from(this.balances.values())
      .reduce((sum, balance) => sum + balance.pendingRewards, BigInt(0));

    return {
      totalSupply: this.totalSupply,
      circulatingSupply: this.circulatingSupply,
      totalLocked,
      totalPendingRewards,
      activeStakers: this.stakingPositions.size,
      totalTransfers: this.transfers.length,
      stakingAPY: this.stakingRewardRate * 100
    };
  }

  /**
   * Format token amount for display
   */
  formatAmount(amount: bigint, precision: number = 4): string {
    const divisor = BigInt(10 ** this.decimals);
    const whole = amount / divisor;
    const remainder = amount % divisor;
    const decimal = Number(remainder) / (10 ** this.decimals);
    
    return (Number(whole) + decimal).toFixed(precision);
  }

  /**
   * Parse token amount from string
   */
  parseAmount(amount: string): bigint {
    const multiplier = BigInt(10 ** this.decimals);
    const num = parseFloat(amount);
    return BigInt(Math.floor(num * (10 ** this.decimals)));
  }

  private generateTransferId(): string {
    return `priv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateStakeId(staker: string, validator: string): string {
    return `stake_${staker.slice(-8)}_${validator.slice(-8)}_${Date.now()}`;
  }
}

// Singleton instance
export const privToken = new PRIVToken();