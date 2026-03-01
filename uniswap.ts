import { ethers } from "hardhat";
import { BigNumberish, Signer } from "ethers";
import {
  ADDRESSES, ERC20_ABI, WETH_ABI, V2_ROUTER_ABI, V2_FACTORY_ABI,
  V2_PAIR_ABI, V3_ROUTER_ABI, V3_QUOTER_ABI, V3_POOL_ABI,
  V3_FACTORY_ABI, V3_POSITION_MANAGER_ABI, FEE_TIERS,
} from "./contracts/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const deadline = () => Math.floor(Date.now() / 1000) + 600;

export function encodePath(tokens: string[], fees: number[]): string {
  let encoded = tokens[0];
  for (let i = 0; i < fees.length; i++) {
    encoded += fees[i].toString(16).padStart(6, "0");
    encoded += tokens[i + 1].slice(2);
  }
  return encoded;
}

// ─── Token Utils ──────────────────────────────────────────────────────────────

export async function getTokenInfo(tokenAddress: string) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, ethers.provider);
  const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
  return { symbol, decimals };
}

export async function getTokenBalance(tokenAddress: string, account: string): Promise<bigint> {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, ethers.provider);
  return token.balanceOf(account);
}

export async function approveToken(
  tokenAddress: string,
  spender: string,
  amount: BigNumberish,
  signer: Signer
): Promise<void> {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const tx = await token.approve(spender, amount);
  await tx.wait();
}

// ─── WETH ─────────────────────────────────────────────────────────────────────

export async function wrapETH(amount: BigNumberish, signer: Signer): Promise<void> {
  const weth = new ethers.Contract(ADDRESSES.WETH, WETH_ABI, signer);
  const tx = await weth.deposit({ value: amount });
  await tx.wait();
}

export async function unwrapWETH(amount: BigNumberish, signer: Signer): Promise<void> {
  const weth = new ethers.Contract(ADDRESSES.WETH, WETH_ABI, signer);
  const tx = await weth.withdraw(amount);
  await tx.wait();
}

// ─── Uniswap V2 ───────────────────────────────────────────────────────────────

export async function v2SwapExactETHForTokens(
  tokenOut: string,
  amountETH: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<bigint[]> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, signer);
  const path = [ADDRESSES.WETH, tokenOut];
  const tx = await router.swapExactETHForTokens(
    amountOutMin, path, recipient, deadline(), { value: amountETH }
  );
  const receipt = await tx.wait();
  const amounts = await router.getAmountsOut(amountETH, path);
  return amounts;
}

export async function v2SwapExactTokensForETH(
  tokenIn: string,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, signer);
  await approveToken(tokenIn, ADDRESSES.V2_ROUTER, amountIn, signer);
  const tx = await router.swapExactTokensForETH(
    amountIn, amountOutMin, [tokenIn, ADDRESSES.WETH], recipient, deadline()
  );
  await tx.wait();
}

export async function v2SwapExactTokensForTokens(
  tokenIn: string,
  tokenOut: string,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, signer);
  await approveToken(tokenIn, ADDRESSES.V2_ROUTER, amountIn, signer);
  const tx = await router.swapExactTokensForTokens(
    amountIn, amountOutMin, [tokenIn, ADDRESSES.WETH, tokenOut], recipient, deadline()
  );
  await tx.wait();
}

export async function v2GetAmountsOut(
  amountIn: BigNumberish,
  path: string[]
): Promise<bigint[]> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, ethers.provider);
  return router.getAmountsOut(amountIn, path);
}

export async function v2AddLiquidity(
  tokenA: string,
  tokenB: string,
  amountA: BigNumberish,
  amountB: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<{ amountA: bigint; amountB: bigint; liquidity: bigint }> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, signer);
  await approveToken(tokenA, ADDRESSES.V2_ROUTER, amountA, signer);
  await approveToken(tokenB, ADDRESSES.V2_ROUTER, amountB, signer);
  const tx = await router.addLiquidity(
    tokenA, tokenB, amountA, amountB, 0n, 0n, recipient, deadline()
  );
  const receipt = await tx.wait();
  return { amountA: BigInt(amountA.toString()), amountB: BigInt(amountB.toString()), liquidity: 0n };
}

export async function v2RemoveLiquidity(
  tokenA: string,
  tokenB: string,
  liquidity: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const router = new ethers.Contract(ADDRESSES.V2_ROUTER, V2_ROUTER_ABI, signer);
  const factory = new ethers.Contract(ADDRESSES.V2_FACTORY, V2_FACTORY_ABI, ethers.provider);
  const pairAddr = await factory.getPair(tokenA, tokenB);
  await approveToken(pairAddr, ADDRESSES.V2_ROUTER, liquidity, signer);
  const tx = await router.removeLiquidity(
    tokenA, tokenB, liquidity, 0n, 0n, recipient, deadline()
  );
  await tx.wait();
}

export async function v2GetPairReserves(
  tokenA: string,
  tokenB: string
): Promise<{ reserve0: bigint; reserve1: bigint; token0: string }> {
  const factory = new ethers.Contract(ADDRESSES.V2_FACTORY, V2_FACTORY_ABI, ethers.provider);
  const pairAddr = await factory.getPair(tokenA, tokenB);
  if (pairAddr === ethers.ZeroAddress) throw new Error("Pair does not exist");
  const pair = new ethers.Contract(pairAddr, V2_PAIR_ABI, ethers.provider);
  const [reserve0, reserve1] = await pair.getReserves();
  const token0 = await pair.token0();
  return { reserve0, reserve1, token0 };
}

// ─── Uniswap V3 ───────────────────────────────────────────────────────────────

export async function v3SwapExactInputSingle(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<bigint> {
  const router = new ethers.Contract(ADDRESSES.V3_ROUTER, V3_ROUTER_ABI, signer);
  await approveToken(tokenIn, ADDRESSES.V3_ROUTER, amountIn, signer);
  const params = {
    tokenIn, tokenOut, fee, recipient,
    deadline: deadline(),
    amountIn,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0n,
  };
  const tx = await router.exactInputSingle(params);
  await tx.wait();
  return 0n; // actual amountOut would need event parsing
}

export async function v3SwapExactOutputSingle(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountOut: BigNumberish,
  amountInMax: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<bigint> {
  const router = new ethers.Contract(ADDRESSES.V3_ROUTER, V3_ROUTER_ABI, signer);
  await approveToken(tokenIn, ADDRESSES.V3_ROUTER, amountInMax, signer);
  const params = {
    tokenIn, tokenOut, fee, recipient,
    deadline: deadline(),
    amountOut,
    amountInMaximum: amountInMax,
    sqrtPriceLimitX96: 0n,
  };
  const tx = await router.exactOutputSingle(params);
  await tx.wait();
  return 0n;
}

export async function v3SwapExactInputMultihop(
  tokens: string[],
  fees: number[],
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const router = new ethers.Contract(ADDRESSES.V3_ROUTER, V3_ROUTER_ABI, signer);
  await approveToken(tokens[0], ADDRESSES.V3_ROUTER, amountIn, signer);
  const path = encodePath(tokens, fees);
  const params = {
    path,
    recipient,
    deadline: deadline(),
    amountIn,
    amountOutMinimum: amountOutMin,
  };
  const tx = await router.exactInput(params);
  await tx.wait();
}

export async function v3QuoteExactInputSingle(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: BigNumberish
): Promise<bigint> {
  const quoter = new ethers.Contract(ADDRESSES.V3_QUOTER, V3_QUOTER_ABI, ethers.provider);
  return quoter.quoteExactInputSingle.staticCall(tokenIn, tokenOut, fee, amountIn, 0n);
}

export async function v3GetPoolInfo(
  tokenA: string,
  tokenB: string,
  fee: number
): Promise<{ sqrtPriceX96: bigint; tick: number; liquidity: bigint; poolAddress: string }> {
  const factory = new ethers.Contract(ADDRESSES.V3_FACTORY, V3_FACTORY_ABI, ethers.provider);
  const poolAddress = await factory.getPool(tokenA, tokenB, fee);
  if (poolAddress === ethers.ZeroAddress) throw new Error("Pool does not exist");
  const pool = new ethers.Contract(poolAddress, V3_POOL_ABI, ethers.provider);
  const [slot0, liquidity] = await Promise.all([pool.slot0(), pool.liquidity()]);
  return { sqrtPriceX96: slot0.sqrtPriceX96, tick: slot0.tick, liquidity, poolAddress };
}

export async function v3MintPosition(
  token0: string,
  token1: string,
  fee: number,
  tickLower: number,
  tickUpper: number,
  amount0: BigNumberish,
  amount1: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<{ tokenId: bigint; liquidity: bigint; amount0: bigint; amount1: bigint }> {
  const pm = new ethers.Contract(ADDRESSES.V3_POSITION_MANAGER, V3_POSITION_MANAGER_ABI, signer);
  await approveToken(token0, ADDRESSES.V3_POSITION_MANAGER, amount0, signer);
  await approveToken(token1, ADDRESSES.V3_POSITION_MANAGER, amount1, signer);
  const params = {
    token0, token1, fee, tickLower, tickUpper,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient,
    deadline: deadline(),
  };
  const tx = await pm.mint(params);
  const receipt = await tx.wait();
  return { tokenId: 0n, liquidity: 0n, amount0: 0n, amount1: 0n };
}

export async function v3CollectFees(
  tokenId: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<{ amount0: bigint; amount1: bigint }> {
  const pm = new ethers.Contract(ADDRESSES.V3_POSITION_MANAGER, V3_POSITION_MANAGER_ABI, signer);
  const MAX_UINT128 = 2n ** 128n - 1n;
  const tx = await pm.collect({
    tokenId,
    recipient,
    amount0Max: MAX_UINT128,
    amount1Max: MAX_UINT128,
  });
  await tx.wait();
  return { amount0: 0n, amount1: 0n };
}

export async function v3DecreaseLiquidity(
  tokenId: BigNumberish,
  liquidity: BigNumberish,
  signer: Signer
): Promise<{ amount0: bigint; amount1: bigint }> {
  const pm = new ethers.Contract(ADDRESSES.V3_POSITION_MANAGER, V3_POSITION_MANAGER_ABI, signer);
  const tx = await pm.decreaseLiquidity({
    tokenId,
    liquidity,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: deadline(),
  });
  await tx.wait();
  return { amount0: 0n, amount1: 0n };
}
