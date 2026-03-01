import { ethers } from "hardhat";
import { Signer, BigNumberish } from "ethers";
import { ADDR, FEE } from "./constants";
import { approve, v3Router, v3Quoter, encodePath, dl, e18 } from "./helpers";

/** Quote: exact input single */
export async function quoteExactIn(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: BigNumberish
): Promise<bigint> {
  return v3Quoter().quoteExactInputSingle.staticCall(tokenIn, tokenOut, fee, amountIn, 0n);
}

/** Quote: exact output single */
export async function quoteExactOut(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountOut: BigNumberish
): Promise<bigint> {
  return v3Quoter().quoteExactOutputSingle.staticCall(tokenIn, tokenOut, fee, amountOut, 0n);
}

/** Quote: multihop */
export async function quoteMultihop(
  tokens: string[],
  fees: number[],
  amountIn: BigNumberish
): Promise<bigint> {
  const path = encodePath(tokens, fees);
  return v3Quoter().quoteExactInput.staticCall(path, amountIn);
}

/** Swap: exact input single */
export async function swapExactIn(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokenIn, ADDR.V3_ROUTER, amountIn, signer);
  const tx = await v3Router(signer).exactInputSingle({
    tokenIn, tokenOut, fee, recipient,
    deadline: dl(),
    amountIn,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0n,
  });
  await tx.wait();
}

/** Swap: exact output single */
export async function swapExactOut(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountOut: BigNumberish,
  amountInMax: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokenIn, ADDR.V3_ROUTER, amountInMax, signer);
  const tx = await v3Router(signer).exactOutputSingle({
    tokenIn, tokenOut, fee, recipient,
    deadline: dl(),
    amountOut,
    amountInMaximum: amountInMax,
    sqrtPriceLimitX96: 0n,
  });
  await tx.wait();
}

/** Swap: multihop exact input */
export async function swapMultihopExactIn(
  tokens: string[],
  fees: number[],
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokens[0], ADDR.V3_ROUTER, amountIn, signer);
  const tx = await v3Router(signer).exactInput({
    path: encodePath(tokens, fees),
    recipient,
    deadline: dl(),
    amountIn,
    amountOutMinimum: amountOutMin,
  });
  await tx.wait();
}

/** Swap: multihop exact output */
export async function swapMultihopExactOut(
  tokens: string[],
  fees: number[],
  amountOut: BigNumberish,
  amountInMax: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  // Reverse path for exactOutput
  const reversed = [...tokens].reverse();
  const reversedFees = [...fees].reverse();
  await approve(tokens[0], ADDR.V3_ROUTER, amountInMax, signer);
  const tx = await v3Router(signer).exactOutput({
    path: encodePath(reversed, reversedFees),
    recipient,
    deadline: dl(),
    amountOut,
    amountInMaximum: amountInMax,
  });
  await tx.wait();
}

// Standalone runner
async function main() {
  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();
  const amountIn = e18("1");

  const quoted = await quoteExactIn(ADDR.WETH, ADDR.USDC, FEE.MED, amountIn);
  console.log(`V3 Quote: 1 WETH → ${ethers.formatUnits(quoted, 6)} USDC`);

  // Wrap ETH and swap
  const wethContract = new ethers.Contract(ADDR.WETH, ["function deposit() payable"], signer);
  await (await wethContract.deposit({ value: amountIn })).wait();
  await swapExactIn(ADDR.WETH, ADDR.USDC, FEE.MED, amountIn, 0n, addr, signer);
  console.log("V3 swap done");
}

main().catch(console.error);