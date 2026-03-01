// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

interface IUniswapV2Router02 {
    function WETH() external pure returns (address);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external view returns (uint256[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes   path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputParams {
        bytes   path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params)
        external payable returns (uint256 amountOut);

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external payable returns (uint256 amountIn);

    function exactOutput(ExactOutputParams calldata params)
        external payable returns (uint256 amountIn);
}


contract UniswapInteractor {


    address public constant WETH      = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC      = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI       = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // ── State ──────────────────────────────────────────────────────────────────

    address public owner;

    // ── Events ─────────────────────────────────────────────────────────────────

    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);
    event V2Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event V3Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 liquidity);
    event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 liquidity);

    // ── Errors ─────────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAmount();
    error TransferFailed();


    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonZero(uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        _;
    }


    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    // ── Internal helpers ───────────────────────────────────────────────────────

    function _deadline() internal view returns (uint256) {
        return block.timestamp + 600;
    }

    function _approve(address token, address spender, uint256 amount) internal {
        if (IERC20(token).allowance(address(this), spender) < amount) {
            IERC20(token).approve(spender, type(uint256).max);
        }
    }


    /// @notice Wrap ETH sent with call into WETH held by this contract
    function wrapETH() external payable nonZero(msg.value) {
        IWETH(WETH).deposit{value: msg.value}();
        emit Wrapped(msg.sender, msg.value);
    }

    /// @notice Unwrap WETH held by this contract and send ETH to owner
    function unwrapWETH(uint256 amount) external onlyOwner nonZero(amount) {
        IWETH(WETH).withdraw(amount);
        (bool ok,) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Unwrapped(msg.sender, amount);
    }

    // ── V2: Swaps ──────────────────────────────────────────────────────────────

    /// @notice Swap exact ETH → token
    function v2SwapExactETHForTokens(
        address tokenOut,
        uint256 amountOutMin,
        address recipient
    ) external payable nonZero(msg.value) returns (uint256[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = tokenOut;
        amounts = IUniswapV2Router02(V2_ROUTER).swapExactETHForTokens{value: msg.value}(
            amountOutMin, path, recipient, _deadline()
        );
        emit V2Swap(WETH, tokenOut, msg.value, amounts[1]);
    }

    /// @notice Swap exact token → ETH
    function v2SwapExactTokensForETH(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external nonZero(amountIn) returns (uint256[] memory amounts) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        _approve(tokenIn, V2_ROUTER, amountIn);
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = WETH;
        amounts = IUniswapV2Router02(V2_ROUTER).swapExactTokensForETH(
            amountIn, amountOutMin, path, recipient, _deadline()
        );
        emit V2Swap(tokenIn, WETH, amountIn, amounts[1]);
    }

    /// @notice Swap exact tokenIn → tokenOut (routes through WETH)
    function v2SwapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external nonZero(amountIn) returns (uint256[] memory amounts) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        _approve(tokenIn, V2_ROUTER, amountIn);
        address[] memory path = new address[](3);
        path[0] = tokenIn;
        path[1] = WETH;
        path[2] = tokenOut;
        amounts = IUniswapV2Router02(V2_ROUTER).swapExactTokensForTokens(
            amountIn, amountOutMin, path, recipient, _deadline()
        );
        emit V2Swap(tokenIn, tokenOut, amountIn, amounts[2]);
    }

    /// @notice Swap tokenIn for an exact amount of tokenOut
    function v2SwapTokensForExactTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMax,
        address recipient
    ) external nonZero(amountOut) returns (uint256[] memory amounts) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountInMax);
        _approve(tokenIn, V2_ROUTER, amountInMax);
        address[] memory path = new address[](3);
        path[0] = tokenIn;
        path[1] = WETH;
        path[2] = tokenOut;
        amounts = IUniswapV2Router02(V2_ROUTER).swapTokensForExactTokens(
            amountOut, amountInMax, path, recipient, _deadline()
        );
        uint256 unused = amountInMax - amounts[0];
        if (unused > 0) IERC20(tokenIn).transfer(msg.sender, unused);
        emit V2Swap(tokenIn, tokenOut, amounts[0], amountOut);
    }

    // ── V2: Liquidity ──────────────────────────────────────────────────────────

    /// @notice Add token/token liquidity
    function v2AddLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address recipient
    ) external returns (uint256 usedA, uint256 usedB, uint256 liquidity) {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        _approve(tokenA, V2_ROUTER, amountA);
        _approve(tokenB, V2_ROUTER, amountB);
        (usedA, usedB, liquidity) = IUniswapV2Router02(V2_ROUTER).addLiquidity(
            tokenA, tokenB, amountA, amountB, 0, 0, recipient, _deadline()
        );
        if (amountA > usedA) IERC20(tokenA).transfer(msg.sender, amountA - usedA);
        if (amountB > usedB) IERC20(tokenB).transfer(msg.sender, amountB - usedB);
        emit LiquidityAdded(tokenA, tokenB, liquidity);
    }

    /// @notice Add ETH/token liquidity
    function v2AddLiquidityETH(
        address token,
        uint256 amountToken,
        address recipient
    ) external payable nonZero(msg.value) returns (uint256 usedToken, uint256 usedETH, uint256 liquidity) {
        IERC20(token).transferFrom(msg.sender, address(this), amountToken);
        _approve(token, V2_ROUTER, amountToken);
        (usedToken, usedETH, liquidity) = IUniswapV2Router02(V2_ROUTER).addLiquidityETH{value: msg.value}(
            token, amountToken, 0, 0, recipient, _deadline()
        );
        if (amountToken > usedToken) IERC20(token).transfer(msg.sender, amountToken - usedToken);
        if (msg.value > usedETH) {
            (bool ok,) = msg.sender.call{value: msg.value - usedETH}("");
            if (!ok) revert TransferFailed();
        }
        emit LiquidityAdded(token, WETH, liquidity);
    }

    /// @notice Remove token/token liquidity
    function v2RemoveLiquidity(
        address tokenA,
        address tokenB,
        address pair,
        uint256 liquidity,
        address recipient
    ) external returns (uint256 amountA, uint256 amountB) {
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        _approve(pair, V2_ROUTER, liquidity);
        (amountA, amountB) = IUniswapV2Router02(V2_ROUTER).removeLiquidity(
            tokenA, tokenB, liquidity, 0, 0, recipient, _deadline()
        );
        emit LiquidityRemoved(tokenA, tokenB, liquidity);
    }

    /// @notice Remove ETH/token liquidity
    function v2RemoveLiquidityETH(
        address token,
        address pair,
        uint256 liquidity,
        address recipient
    ) external returns (uint256 amountToken, uint256 amountETH) {
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        _approve(pair, V2_ROUTER, liquidity);
        (amountToken, amountETH) = IUniswapV2Router02(V2_ROUTER).removeLiquidityETH(
            token, liquidity, 0, 0, recipient, _deadline()
        );
        emit LiquidityRemoved(token, WETH, liquidity);
    }

    // ── V3: Swaps ──────────────────────────────────────────────────────────────

    /// @notice V3 exact input single hop
    function v3SwapExactIn(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external nonZero(amountIn) returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        _approve(tokenIn, V3_ROUTER, amountIn);
        amountOut = IUniswapV3Router(V3_ROUTER).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               fee,
                recipient:         recipient,
                deadline:          _deadline(),
                amountIn:          amountIn,
                amountOutMinimum:  amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );
        emit V3Swap(tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice V3 exact output single hop
    function v3SwapExactOut(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountOut,
        uint256 amountInMax,
        address recipient
    ) external nonZero(amountOut) returns (uint256 amountIn) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountInMax);
        _approve(tokenIn, V3_ROUTER, amountInMax);
        amountIn = IUniswapV3Router(V3_ROUTER).exactOutputSingle(
            IUniswapV3Router.ExactOutputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               fee,
                recipient:         recipient,
                deadline:          _deadline(),
                amountOut:         amountOut,
                amountInMaximum:   amountInMax,
                sqrtPriceLimitX96: 0
            })
        );
        uint256 unused = amountInMax - amountIn;
        if (unused > 0) IERC20(tokenIn).transfer(msg.sender, unused);
        emit V3Swap(tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice V3 exact input multihop
    function v3SwapExactInMultihop(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        bytes calldata path,
        address recipient
    ) external nonZero(amountIn) returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        _approve(tokenIn, V3_ROUTER, amountIn);
        amountOut = IUniswapV3Router(V3_ROUTER).exactInput(
            IUniswapV3Router.ExactInputParams({
                path:             path,
                recipient:        recipient,
                deadline:         _deadline(),
                amountIn:         amountIn,
                amountOutMinimum: amountOutMin
            })
        );
    }

    /// @notice V3 exact output multihop (path must be reversed)
    function v3SwapExactOutMultihop(
        address tokenIn,
        uint256 amountOut,
        uint256 amountInMax,
        bytes calldata path,
        address recipient
    ) external nonZero(amountOut) returns (uint256 amountIn) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountInMax);
        _approve(tokenIn, V3_ROUTER, amountInMax);
        amountIn = IUniswapV3Router(V3_ROUTER).exactOutput(
            IUniswapV3Router.ExactOutputParams({
                path:            path,
                recipient:       recipient,
                deadline:        _deadline(),
                amountOut:       amountOut,
                amountInMaximum: amountInMax
            })
        );
        uint256 unused = amountInMax - amountIn;
        if (unused > 0) IERC20(tokenIn).transfer(msg.sender, unused);
    }


    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function rescueETH() external onlyOwner {
        (bool ok,) = owner.call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
