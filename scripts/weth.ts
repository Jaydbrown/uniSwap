import { ethers } from "hardhat";
import { Signer, BigNumberish } from "ethers";
import { weth } from "./helpers";

export async function wrap(amount: BigNumberish, signer: Signer): Promise<void> {
  const tx = await weth(signer).deposit({ value: amount });
  await tx.wait();
  console.log(`Wrapped ${ethers.formatEther(amount)} ETH → WETH`);
}

export async function unwrap(amount: BigNumberish, signer: Signer): Promise<void> {
  const tx = await weth(signer).withdraw(amount);
  await tx.wait();
  console.log(`Unwrapped ${ethers.formatEther(amount)} WETH → ETH`);
}

async function main() {
  const [signer] = await ethers.getSigners();
  const amount = ethers.parseEther("1");
  await wrap(amount, signer);
  await unwrap(amount, signer);
}

main().catch(console.error);