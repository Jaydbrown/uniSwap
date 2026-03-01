import { ethers } from "hardhat";
import { Signer, BigNumberish } from "ethers";
import { ADDR, FEE } from "../scripts/constants";
import { approve, v2Router, dl, e18 } from "../scripts/helpers";

/** ETH → Token */
export async function swapETHForTokens(
  tokenOut: string,
  amountETH: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<bigint[]> {
  const router = v2Router(signer);
  const tx = await router.swapExactETHForTokens(
    amountOutMin, [ADDR.WETH, tokenOut], recipient, dl(), { value: amountETH }
  );
  const receipt = await tx.wait();
  return receipt;
}

/** Token → ETH */
export async function swapTokensForETH(
  tokenIn: string,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokenIn, ADDR.V2_ROUTER, amountIn, signer);
  const tx = await v2Router(signer).swapExactTokensForETH(
    amountIn, amountOutMin, [tokenIn, ADDR.WETH], recipient, dl()
  );
  await tx.wait();
}

/** Token → Token */
export async function swapTokensForTokens(
  tokenIn: string,
  tokenOut: string,
  amountIn: BigNumberish,
  amountOutMin: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokenIn, ADDR.V2_ROUTER, amountIn, signer);
  const tx = await v2Router(signer).swapExactTokensForTokens(
    amountIn, amountOutMin, [tokenIn, ADDR.WETH, tokenOut], recipient, dl()
  );
  await tx.wait();
}

export async function swapTokensForExact(
  tokenIn: string,
  tokenOut: string,
  amountOut: BigNumberish,
  amountInMax: BigNumberish,
  recipient: string,
  signer: Signer
): Promise<void> {
  await approve(tokenIn, ADDR.V2_ROUTER, amountInMax, signer);
  const tx = await v2Router(signer).swapTokensForExactTokens(
    amountOut, amountInMax, [tokenIn, ADDR.WETH, tokenOut], recipient, dl()
  );
  await tx.wait();
}


export async function getAmountsOut(amountIn: BigNumberish, path: string[]): Promise<bigint[]> {
  const router = new ethers.Contract(ADDR.V2_ROUTER, [
    "function getAmountsOut(uint,address[]) view returns (uint[])"
  ], ethers.provider);
  return router.getAmountsOut(amountIn, path);
}

export async function getAmountsIn(amountOut: BigNumberish, path: string[]): Promise<bigint[]> {
  const router = new ethers.Contract(ADDR.V2_ROUTER, [
    "function getAmountsIn(uint,address[]) view returns (uint[])"
  ], ethers.provider);
  return router.getAmountsIn(amountOut, path);
}

// Standalone runner
async function main() {
  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();
  const amountETH = e18("1");

  const amounts = await getAmountsOut(amountETH, [ADDR.WETH, ADDR.USDC]);
  console.log(`1 ETH → ${ethers.formatUnits(amounts[1], 6)} USDC`);

  await swapETHForTokens(ADDR.USDC, amountETH, 0n, addr, signer);
  console.log("Swap ETH → USDC done");
}

main().catch(console.error);