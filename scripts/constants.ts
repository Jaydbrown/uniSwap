export const ADDR = {
  WETH:       "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC:       "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI:        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDT:       "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WBTC:       "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",

  V2_ROUTER:  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",

  V3_ROUTER:  "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  V3_FACTORY: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  V3_QUOTER:  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  V3_NFTPM:   "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
};

// Aliases for backwards compatibility
export const ADDRESSES = ADDR;

export const FEE = { LOW: 500, MED: 3000, HIGH: 10000 } as const;

// Alias for backwards compatibility
export const FEE_TIERS = { LOW: 500, MEDIUM: 3000, HIGH: 10000 } as const;

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
];

export const WETH_ABI = [
  ...ERC20_ABI,
  "function deposit() payable",
  "function withdraw(uint256)",
];

export const V2_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) returns (uint amountToken, uint amountETH)",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
  "function getAmountsIn(uint amountOut, address[] path) view returns (uint[] amounts)",
  "function WETH() view returns (address)",
];

export const V2_FACTORY_ABI = [
  "function getPair(address, address) view returns (address)",
  "function allPairs(uint) view returns (address)",
  "function allPairsLength() view returns (uint)",
];

export const V2_PAIR_ABI = [
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
];

export const V3_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
  "function exactInput((bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum)) payable returns (uint256 amountOut)",
  "function exactOutputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountOut,uint256 amountInMaximum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountIn)",
  "function exactOutput((bytes path,address recipient,uint256 deadline,uint256 amountOut,uint256 amountInMaximum)) payable returns (uint256 amountIn)",
];

export const V3_FACTORY_ABI = [
  "function getPool(address, address, uint24) view returns (address)",
];

export const V3_QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) returns (uint256 amountOut)",
  "function quoteExactInput(bytes path, uint256 amountIn) returns (uint256 amountOut)",
  "function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) returns (uint256 amountIn)",
];

export const V3_POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
  "function liquidity() view returns (uint128)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
  "function feeGrowthGlobal0X128() view returns (uint256)",
  "function feeGrowthGlobal1X128() view returns (uint256)",
];

export const V3_NFTPM_ABI = [
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
  "function increaseLiquidity((uint256 tokenId,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint128 liquidity,uint256 amount0,uint256 amount1)",
  "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256 amount0,uint256 amount1)",
  "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) returns (uint256 amount0,uint256 amount1)",
  "function burn(uint256 tokenId)",
  "function positions(uint256 tokenId) view returns (uint96,address,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256,uint256,uint128,uint128)",
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
];


export const V3_POSITION_MANAGER_ABI = V3_NFTPM_ABI;
