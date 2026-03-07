import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { ADDR, FEE } from "../scripts/constants";
import { balanceOf, e18, eUnits } from "../scripts/helpers";
import { wrap, unwrap } from "../scripts/weth";
import {
  swapETHForTokens, swapTokensForETH, swapTokensForTokens,
  swapTokensForExact, getAmountsOut, getAmountsIn,
} from "../scripts/v2Swap";
import {
  getReserves, addLiquidity, addLiquidityETH,
  removeLiquidity, removeLiquidityETH,
} from "../scripts/V2liquidity";
import {
  quoteExactIn, quoteExactOut, quoteMultihop,
  swapExactIn, swapExactOut, swapMultihopExactIn,
} from "../scripts/v3Swap";
import {
  getPoolInfo, mintPosition, getPosition,
  increaseLiquidity, decreaseLiquidity, collectFees, fullExit,
} from "../scripts/v3Liquidity";

const ONE = e18("1");
const FIVE = e18("5");

describe("Uniswap Mainnet Fork", () => {
  let signer: Signer;
  let addr: string;

  before(async () => {
    [signer] = await ethers.getSigners();
    addr = await signer.getAddress();
  });

  describe("WETH", () => {
    it("wraps ETH → WETH", async () => {
      const before = await balanceOf(ADDR.WETH, addr);
      await wrap(ONE, signer);
      expect(await balanceOf(ADDR.WETH, addr)).to.equal(before + ONE);
    });

    it("unwraps WETH → ETH", async () => {
      const before = await balanceOf(ADDR.WETH, addr);
      await unwrap(ONE, signer);
      expect(await balanceOf(ADDR.WETH, addr)).to.equal(before - ONE);
    });
  });

  // ─── V2 Quotes ───────────────────────────────────────────────────────────────

  describe("V2 Quotes", () => {
    it("getAmountsOut: ETH → USDC", async () => {
      const [, out] = await getAmountsOut(ONE, [ADDR.WETH, ADDR.USDC]);
      expect(out).to.be.gt(0n);
      console.log(`    1 ETH → ${ethers.formatUnits(out, 6)} USDC (V2)`);
    });

    it("getAmountsIn: USDC ← 1 ETH", async () => {
      const [amtIn] = await getAmountsIn(ONE, [ADDR.USDC, ADDR.WETH]);
      expect(amtIn).to.be.gt(0n);
    });

    it("getReserves: WETH/USDC pair", async () => {
      const { reserve0, reserve1 } = await getReserves(ADDR.WETH, ADDR.USDC);
      expect(reserve0).to.be.gt(0n);
      expect(reserve1).to.be.gt(0n);
      console.log(`    WETH: ${ethers.formatEther(reserve0)} | USDC: ${ethers.formatUnits(reserve1, 6)}`);
    });
  });


  describe("V2 Swaps", () => {
    it("swaps ETH → USDC", async () => {
      const before = await balanceOf(ADDR.USDC, addr);
      await swapETHForTokens(ADDR.USDC, ONE, 0n, addr, signer);
      const after = await balanceOf(ADDR.USDC, addr);
      expect(after).to.be.gt(before);
      console.log(`    Got ${ethers.formatUnits(after - before, 6)} USDC`);
    });

    it("swaps ETH → DAI", async () => {
      const before = await balanceOf(ADDR.DAI, addr);
      await swapETHForTokens(ADDR.DAI, ONE, 0n, addr, signer);
      const after = await balanceOf(ADDR.DAI, addr);
      expect(after).to.be.gt(before);
    });

    it("swaps USDC → ETH", async () => {
      const usdcBal = await balanceOf(ADDR.USDC, addr);
      const ethBefore = await ethers.provider.getBalance(addr);
      await swapTokensForETH(ADDR.USDC, usdcBal / 2n, 0n, addr, signer);
      // ETH should go up (minus gas)
      const ethAfter = await ethers.provider.getBalance(addr);
      expect(ethAfter).to.be.gt(ethBefore - ONE);
    });

    it("swaps USDC → DAI (token → token)", async () => {
      const usdcBal = await balanceOf(ADDR.USDC, addr);
      const daiBefore = await balanceOf(ADDR.DAI, addr);
      await swapTokensForTokens(ADDR.USDC, ADDR.DAI, usdcBal / 4n, 0n, addr, signer);
      expect(await balanceOf(ADDR.DAI, addr)).to.be.gt(daiBefore);
    });

    it("swaps for exact output (USDC → exact DAI)", async () => {
      const exactDAI = e18("50");
      const usdcBal = await balanceOf(ADDR.USDC, addr);
      const daiBefore = await balanceOf(ADDR.DAI, addr);
      await swapTokensForExact(ADDR.USDC, ADDR.DAI, exactDAI, usdcBal / 2n, addr, signer);
      const daiAfter = await balanceOf(ADDR.DAI, addr);
      expect(daiAfter - daiBefore).to.be.closeTo(exactDAI, e18("1"));
    });
  });



  describe("V2 Liquidity", () => {
    let pairAddr: string;

    it("adds ETH/USDC liquidity", async () => {
      await swapETHForTokens(ADDR.USDC, ONE, 0n, addr, signer);
      const usdcBal = await balanceOf(ADDR.USDC, addr);
      await addLiquidityETH(ADDR.USDC, usdcBal / 3n, e18("0.1"), addr, signer);
      const { pairAddr: pa } = await getReserves(ADDR.WETH, ADDR.USDC);
      const lpBal = await balanceOf(pa, addr);
      expect(lpBal).to.be.gt(0n);
      pairAddr = pa;
      console.log(`    LP tokens: ${ethers.formatEther(lpBal)}`);
    });

    it("removes ETH/USDC liquidity", async () => {
      const { pairAddr: pa } = await getReserves(ADDR.WETH, ADDR.USDC);
      const lpBal = await balanceOf(pa, addr);
      if (lpBal === 0n) return; // skip if no LP
      await removeLiquidityETH(ADDR.USDC, lpBal, addr, signer);
      expect(await balanceOf(pa, addr)).to.equal(0n);
    });

    it("adds WETH/DAI liquidity (token/token)", async () => {
      await wrap(ONE, signer);
      const daiBal = await balanceOf(ADDR.DAI, addr);
      const wethAmt = e18("0.05");
      const daiAmt = daiBal / 5n;
      const { liquidity } = await addLiquidity(ADDR.WETH, ADDR.DAI, wethAmt, daiAmt, addr, signer);
      expect(liquidity).to.be.gt(0n);
    });

    it("removes WETH/DAI liquidity", async () => {
      const { pairAddr: pa } = await getReserves(ADDR.WETH, ADDR.DAI);
      const lpBal = await balanceOf(pa, addr);
      if (lpBal === 0n) return;
      await removeLiquidity(ADDR.WETH, ADDR.DAI, lpBal, addr, signer);
      expect(await balanceOf(pa, addr)).to.equal(0n);
    });
  });


  describe("V3 Quotes", () => {
    before(async () => {
      await wrap(FIVE, signer);
    });

    it("quotes WETH → USDC exact in (0.3%)", async () => {
      const out = await quoteExactIn(ADDR.WETH, ADDR.USDC, FEE.MED, ONE);
      expect(out).to.be.gt(0n);
      console.log(`    V3 quote: 1 WETH → ${ethers.formatUnits(out, 6)} USDC`);
    });

    it("quotes USDC → WETH exact in (0.05%)", async () => {
      const usdcIn = eUnits("1000", 6);
      const out = await quoteExactIn(ADDR.USDC, ADDR.WETH, FEE.LOW, usdcIn);
      expect(out).to.be.gt(0n);
    });

    it("quotes WETH → USDC exact out", async () => {
      const usdcOut = eUnits("2000", 6);
      const amtIn = await quoteExactOut(ADDR.WETH, ADDR.USDC, FEE.MED, usdcOut);
      expect(amtIn).to.be.gt(0n);
    });

    it("quotes multihop: WETH → USDC → DAI", async () => {
      const out = await quoteMultihop(
        [ADDR.WETH, ADDR.USDC, ADDR.DAI], [FEE.MED, FEE.LOW], ONE
      );
      expect(out).to.be.gt(0n);
      console.log(`    Multihop: 1 WETH → ${ethers.formatEther(out)} DAI`);
    });
  });


  describe("V3 Swaps", () => {
    it("swaps WETH → USDC exact in (0.3%)", async () => {
      const before = await balanceOf(ADDR.USDC, addr);
      await swapExactIn(ADDR.WETH, ADDR.USDC, FEE.MED, ONE, 0n, addr, signer);
      expect(await balanceOf(ADDR.USDC, addr)).to.be.gt(before);
    });

    it("swaps WETH → USDC exact in (0.05%)", async () => {
      const before = await balanceOf(ADDR.USDC, addr);
      await swapExactIn(ADDR.WETH, ADDR.USDC, FEE.LOW, e18("0.5"), 0n, addr, signer);
      expect(await balanceOf(ADDR.USDC, addr)).to.be.gt(before);
    });

    it("swaps USDC → WETH exact out", async () => {
      const usdcBal = await balanceOf(ADDR.USDC, addr);
      const wethBefore = await balanceOf(ADDR.WETH, addr);
      const targetWETH = e18("0.1");
      await swapExactOut(ADDR.USDC, ADDR.WETH, FEE.MED, targetWETH, usdcBal / 2n, addr, signer);
      expect(await balanceOf(ADDR.WETH, addr)).to.be.gt(wethBefore);
    });

    it("swaps multihop WETH → USDC → DAI", async () => {
      const daiBefore = await balanceOf(ADDR.DAI, addr);
      await swapMultihopExactIn(
        [ADDR.WETH, ADDR.USDC, ADDR.DAI], [FEE.MED, FEE.LOW],
        e18("0.3"), 0n, addr, signer
      );
      expect(await balanceOf(ADDR.DAI, addr)).to.be.gt(daiBefore);
    });
  });

  // ─── V3 Pool Info ────────────────────────────────────────────────────────────

  describe("V3 Pool Info", () => {
    it("gets WETH/USDC 0.3% pool", async () => {
      const info = await getPoolInfo(ADDR.WETH, ADDR.USDC, FEE.MED);
      expect(info.sqrtPriceX96).to.be.gt(0n);
      expect(info.liquidity).to.be.gt(0n);
      console.log(`    Pool: ${info.address} | Tick: ${info.tick}`);
    });

    it("gets WETH/USDC 0.05% pool", async () => {
      const info = await getPoolInfo(ADDR.WETH, ADDR.USDC, FEE.LOW);
      expect(info.sqrtPriceX96).to.be.gt(0n);
    });

    it("gets WETH/DAI 0.3% pool", async () => {
      const info = await getPoolInfo(ADDR.WETH, ADDR.DAI, FEE.MED);
      expect(info.liquidity).to.be.gt(0n);
    });
  });

  describe("V3 Positions (NonfungiblePositionManager)", () => {
    let tokenId: bigint;

    it("mints a WETH/DAI position", async () => {
      const daiBal = await balanceOf(ADDR.DAI, addr);
      if (daiBal === 0n) {
        await swapETHForTokens(ADDR.DAI, ONE, 0n, addr, signer);
      }
      await wrap(ONE, signer);

      const info = await getPoolInfo(ADDR.WETH, ADDR.DAI, FEE.MED);
      const spacing = 60; // tick spacing for 0.3%
      const tickLower = Math.floor(info.tick / spacing) * spacing - spacing * 10;
      const tickUpper = Math.ceil(info.tick / spacing) * spacing + spacing * 10;

      const wethAmt = e18("0.01");
      const daiAmt = e18("20");

      tokenId = await mintPosition(
        ADDR.WETH, ADDR.DAI, FEE.MED,
        tickLower, tickUpper,
        wethAmt, daiAmt,
        addr, signer
      );
      expect(tokenId).to.be.gt(0n);
      console.log(`    Minted position tokenId: ${tokenId}`);
    });

    it("reads position details", async () => {
      const pos = await getPosition(tokenId, signer);
      expect(pos.liquidity).to.be.gt(0n);
      console.log(`    Liquidity: ${pos.liquidity}`);
    });

    it("increases liquidity", async () => {
      const posBefore = await getPosition(tokenId, signer);
      await increaseLiquidity(tokenId, ADDR.WETH, ADDR.DAI, e18("0.005"), e18("10"), signer);
      const posAfter = await getPosition(tokenId, signer);
      expect(posAfter.liquidity).to.be.gte(posBefore.liquidity);
    });

    it("decreases liquidity", async () => {
      const pos = await getPosition(tokenId, signer);
      await decreaseLiquidity(tokenId, pos.liquidity / 2n, signer);
    });

    it("collects fees", async () => {
      await collectFees(tokenId, addr, signer);
    });

    it("full exit: decrease all → collect → burn", async () => {
      await fullExit(tokenId, addr, signer);
    });
  });



  describe("V2 vs V3 Price Comparison", () => {
    it("compares WETH→USDC price across V2 and V3", async () => {
      const [, v2Out] = await getAmountsOut(ONE, [ADDR.WETH, ADDR.USDC]);
      const v3Out = await quoteExactIn(ADDR.WETH, ADDR.USDC, FEE.MED, ONE);

      const v2price = parseFloat(ethers.formatUnits(v2Out, 6));
      const v3price = parseFloat(ethers.formatUnits(v3Out, 6));
      console.log(`    V2: $${v2price.toFixed(2)} | V3: $${v3price.toFixed(2)} | Δ: $${Math.abs(v2price - v3price).toFixed(2)}`);

      expect(v2Out).to.be.gt(0n);
      expect(v3Out).to.be.gt(0n);
    });
  });



  describe("UniswapInteractor (on-chain contract)", () => {
    let interactor: any;

    before(async () => {
      const Factory = await ethers.getContractFactory("UniswapInteractor");
      interactor = await Factory.deploy();
      await interactor.waitForDeployment();
    });

    it("wraps ETH via contract", async () => {
      const tx = await interactor.wrapETH({ value: ONE });
      await tx.wait();
      const wethBal = await balanceOf(ADDR.WETH, await interactor.getAddress());
      expect(wethBal).to.equal(ONE);
    });

    it("swaps ETH → USDC via contract (V2)", async () => {
      const contractAddr = await interactor.getAddress();
      const usdcBefore = await balanceOf(ADDR.USDC, addr);
      await interactor.v2SwapETHForTokens(ADDR.USDC, 0n, { value: e18("0.5") });
      // tokens go to msg.sender (addr)
      expect(await balanceOf(ADDR.USDC, addr)).to.be.gt(usdcBefore);
    });

    it("unwraps WETH via contract", async () => {
      const wethBal = await balanceOf(ADDR.WETH, await interactor.getAddress());
      if (wethBal > 0n) {
        await interactor.unwrapWETH(wethBal);
      }
    });

    it("rescues ETH from contract", async () => {
      await signer.sendTransaction({ to: await interactor.getAddress(), value: e18("0.1") });
      await interactor.rescueETH();
    });
  });
});