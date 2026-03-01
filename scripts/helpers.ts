import { ethers } from "hardhat";
import { Signer, BigNumberish, Contract } from "ethers";
import {
  ADDR, ERC20_ABI, WETH_ABI, V2_ROUTER_ABI, V2_FACTORY_ABI, V2_PAIR_ABI,
  V3_ROUTER_ABI, V3_FACTORY_ABI, V3_QUOTER_ABI, V3_POOL_ABI, V3_NFTPM_ABI,
} from "./constants";

export const dl = () => Math.floor(Date.now() / 1000) + 600;
export const e18 = (n: string | number) => ethers.parseEther(String(n));
export const eUnits = (n: string | number, d: number) => ethers.parseUnits(String(n), d);

export function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) throw new Error("Invalid path");
  let path = tokens[0].toLowerCase();
  for (let i = 0; i < fees.length; i++) {
    path += fees[i].toString(16).padStart(6, "0");
    path += tokens[i + 1].slice(2).toLowerCase();
  }
  return "0x" + path.slice(2);
}

// ─── Contract getters ─────────────────────────────────────────────────────────

export const weth    = (s?: Signer) => new ethers.Contract(ADDR.WETH,       WETH_ABI,       s ?? ethers.provider);
export const erc20   = (a: string, s?: Signer) => new ethers.Contract(a,    ERC20_ABI,      s ?? ethers.provider);
export const v2Router  = (s: Signer) => new ethers.Contract(ADDR.V2_ROUTER,  V2_ROUTER_ABI,  s);
export const v2Factory = ()          => new ethers.Contract(ADDR.V2_FACTORY, V2_FACTORY_ABI, ethers.provider);
export const v3Router  = (s: Signer) => new ethers.Contract(ADDR.V3_ROUTER,  V3_ROUTER_ABI,  s);
export const v3Factory = ()          => new ethers.Contract(ADDR.V3_FACTORY, V3_FACTORY_ABI, ethers.provider);
export const v3Quoter  = ()          => new ethers.Contract(ADDR.V3_QUOTER,  V3_QUOTER_ABI,  ethers.provider);
export const v3NFTPM   = (s: Signer) => new ethers.Contract(ADDR.V3_NFTPM,   V3_NFTPM_ABI,   s);

export async function pool(tokenA: string, tokenB: string, fee: number): Promise<Contract> {
  const addr = await v3Factory().getPool(tokenA, tokenB, fee);
  if (addr === ethers.ZeroAddress) throw new Error(`No V3 pool: ${tokenA}/${tokenB} fee=${fee}`);
  return new ethers.Contract(addr, V3_POOL_ABI, ethers.provider);
}


export async function balanceOf(token: string, account: string): Promise<bigint> {
  return erc20(token).balanceOf(account);
}

export async function approve(token: string, spender: string, amount: BigNumberish, signer: Signer) {
  const tx = await erc20(token, signer).approve(spender, amount);
  await tx.wait();
}

export async function tokenInfo(token: string) {
  const c = erc20(token);
  const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
  return { symbol, decimals: Number(decimals) };
}