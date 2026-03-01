import { ethers } from "hardhat";
import { Signer, BigNumberish } from "ethers";
import { ADDR, FEE } from "../../scripts/constants";
import { approve, v3NFTPM, pool as getPool, dl, e18 } from "../../scripts/helpers";

export interface PoolInfo {
  address: string;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  token0: string;
  token1: string;
  fee: number;
}

/** Get V3 pool info */
export async function getPoolInfo(tokenA: string, tokenB: string, fee: number): Promise<PoolInfo> {
  const p = await getPool(tokenA, tokenB, fee);
  const [slot0, liquidity, token0, token1, poolFee] = await Promise.all([
    p.slot0(), p.liquidity(), p.token0(), p.token1(), p.fee(),
  ]);
  return {
    address: await p.getAddress(),
    sqrtPriceX96: slot0.sqrtPriceX96,
    tick: Number(slot0.tick),
    liquidity,
    token0,
    token1,
    fee: Number(poolFee),
  };
}

/** Mint a new V3 position */
export async function mintPosition(
  token0: string,
  token1: string,
  fee: number,
  tickLower: number,
  tickUpper: number,
  amount0: BigNumberish,
  amount1: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<bigint> {
  await approve(token0, ADDR.V3_NFTPM, amount0, signer);
  await approve(token1, ADDR.V3_NFTPM, amount1, signer);
  const pm = v3NFTPM(signer);
  const tx = await pm.mint({
    token0, token1, fee,
    tickLower, tickUpper,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient,
    deadline: dl(),
  });
  const receipt = await tx.wait();
  // Parse Transfer event for tokenId
  const iface = new ethers.Interface(["event Transfer(address indexed,address indexed,uint256 indexed tokenId)"]);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed) return parsed.args.tokenId as bigint;
    } catch {}
  }
  throw new Error("Could not get tokenId from mint");
}

export async function getPosition(tokenId: BigNumberish, signer: Signer) {
  const pm = v3NFTPM(signer);
  const pos = await pm.positions(tokenId);
  return {
    token0: pos[2] as string,
    token1: pos[3] as string,
    fee: Number(pos[4]),
    tickLower: Number(pos[5]),
    tickUpper: Number(pos[6]),
    liquidity: pos[7] as bigint,
    tokensOwed0: pos[10] as bigint,
    tokensOwed1: pos[11] as bigint,
  };
}

export async function increaseLiquidity(
  tokenId: BigNumberish,
  token0: string,
  token1: string,
  amount0: BigNumberish,
  amount1: BigNumberish,
  signer: Signer
): Promise<void> {
  await approve(token0, ADDR.V3_NFTPM, amount0, signer);
  await approve(token1, ADDR.V3_NFTPM, amount1, signer);
  const tx = await v3NFTPM(signer).increaseLiquidity({
    tokenId, amount0Desired: amount0, amount1Desired: amount1,
    amount0Min: 0n, amount1Min: 0n, deadline: dl(),
  });
  await tx.wait();
}

export async function decreaseLiquidity(
  tokenId: BigNumberish,
  liquidity: BigNumberish,
  signer: Signer
): Promise<{ amount0: bigint; amount1: bigint }> {
  const tx = await v3NFTPM(signer).decreaseLiquidity({
    tokenId, liquidity, amount0Min: 0n, amount1Min: 0n, deadline: dl(),
  });
  const receipt = await tx.wait();
  return { amount0: 0n, amount1: 0n };
}

export async function collectFees(
  tokenId: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<{ amount0: bigint; amount1: bigint }> {
  const MAX = 2n ** 128n - 1n;
  const tx = await v3NFTPM(signer).collect({
    tokenId, recipient, amount0Max: MAX, amount1Max: MAX,
  });
  await tx.wait();
  return { amount0: 0n, amount1: 0n };
}

export async function burnPosition(tokenId: BigNumberish, signer: Signer): Promise<void> {
  const tx = await v3NFTPM(signer).burn(tokenId);
  await tx.wait();
}


export async function fullExit(
  tokenId: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const pos = await getPosition(tokenId, signer);
  if (pos.liquidity > 0n) {
    await decreaseLiquidity(tokenId, pos.liquidity, signer);
  }
  await collectFees(tokenId, recipient, signer);
  await burnPosition(tokenId, signer);
}

async function main() {
  const info = await getPoolInfo(ADDR.WETH, ADDR.USDC, FEE.MED);
  console.log(`WETH/USDC 0.3% pool: ${info.address}`);
  console.log(`Tick: ${info.tick}, Liquidity: ${info.liquidity}`);
}

main().catch(console.error);