import { ethers } from "hardhat";
import { Signer, BigNumberish } from "ethers";
import { ADDR } from "../contracts/constants";
import { approve, v2Router, v2Factory, balanceOf, dl, e18 } from "../contracts/helpers";


export async function getReserves(tokenA: string, tokenB: string) {
  const factory = v2Factory();
  const pairAddr = await factory.getPair(tokenA, tokenB);
  if (pairAddr === ethers.ZeroAddress) throw new Error("Pair not found");
  const pair = new ethers.Contract(pairAddr, [
    "function getReserves() view returns (uint112,uint112,uint32)",
    "function token0() view returns (address)",
    "function totalSupply() view returns (uint256)",
  ], ethers.provider);
  const [r0, r1] = await pair.getReserves();
  const token0 = await pair.token0();
  const totalSupply = await pair.totalSupply();
  return { pairAddr, token0, reserve0: r0 as bigint, reserve1: r1 as bigint, totalSupply: totalSupply as bigint };
}

/** Add Token/Token liquidity */
export async function addLiquidity(
  tokenA: string,
  tokenB: string,
  amountA: BigNumberish,
  amountB: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<{ amountA: bigint; amountB: bigint; liquidity: bigint }> {
  await approve(tokenA, ADDR.V2_ROUTER, amountA, signer);
  await approve(tokenB, ADDR.V2_ROUTER, amountB, signer);
  const tx = await v2Router(signer).addLiquidity(
    tokenA, tokenB, amountA, amountB, 0n, 0n, recipient, dl()
  );
  await tx.wait();
  const lpBalance = await balanceOf((await v2Factory().getPair(tokenA, tokenB)), recipient);
  return { amountA: BigInt(amountA.toString()), amountB: BigInt(amountB.toString()), liquidity: lpBalance };
}

/** Add ETH/Token liquidity */
export async function addLiquidityETH(
  token: string,
  amountToken: BigNumberish,
  amountETH: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(token, ADDR.V2_ROUTER, amountToken, signer);
  const tx = await v2Router(signer).addLiquidityETH(
    token, amountToken, 0n, 0n, recipient, dl(), { value: amountETH }
  );
  await tx.wait();
}

/** Remove Token/Token liquidity */
export async function removeLiquidity(
  tokenA: string,
  tokenB: string,
  liquidity: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const pairAddr = await v2Factory().getPair(tokenA, tokenB);
  await approve(pairAddr, ADDR.V2_ROUTER, liquidity, signer);
  const tx = await v2Router(signer).removeLiquidity(
    tokenA, tokenB, liquidity, 0n, 0n, recipient, dl()
  );
  await tx.wait();
}

export async function removeLiquidityETH(
  token: string,
  liquidity: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  const pairAddr = await v2Factory().getPair(token, ADDR.WETH);
  await approve(pairAddr, ADDR.V2_ROUTER, liquidity, signer);
  const tx = await v2Router(signer).removeLiquidityETH(
    token, liquidity, 0n, 0n, recipient, dl()
  );
  await tx.wait();
}

async function main() {
  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();

  const { reserve0, reserve1 } = await getReserves(ADDR.WETH, ADDR.USDC);
  console.log(`WETH/USDC reserves: ${ethers.formatEther(reserve0)} WETH / ${ethers.formatUnits(reserve1, 6)} USDC`);
}

main().catch(console.error);