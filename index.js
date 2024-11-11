import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.2/ethers.min.js";
(() => {
  const e = {
      math: {
        floatToWeiBig: (e, t) => BigInt(Math.floor(e * 10 ** t)),
        roundWeiDecimals(e, t) {
          const n = 10n ** t;
          return (e / n) * n;
        },
        roundWeiSigfig(e, t) {
          const n = e.toString(),
            a = n.slice(0, t) + "0".repeat(Math.max(0, n.length - t));
          return BigInt(a);
        },
        weiBigToString(e, t) {
          const n = e.toString();
          if (0 === t) return n;
          let a;
          if (n.length > t) {
            const e = n.length - t;
            a = n.slice(0, e) + "." + n.slice(e);
          } else a = "0." + n.padStart(t, "0");
          return (
            (a = a.replace(/0+$/, "")),
            "." == a.slice(-1) && (a = a.slice(0, -1)),
            a
          );
        },
        priceToOrderString(t, n) {
          let a = e.math.floatToWeiBig(t, 8);
          return (
            (a = e.math.roundWeiDecimals(a, BigInt(n))),
            (a = e.math.roundWeiSigfig(a, 5)),
            e.math.weiBigToString(a, 8)
          );
        },
        sizeToOrderString(t, n) {
          const a = e.math.floatToWeiBig(t, n);
          return e.math.weiBigToString(a, n);
        },
      },
      actions: {
        orderLimit: ({
          asset: e,
          isBid: t,
          price: n,
          size: a,
          isReduce: s,
          tif: i,
          cloid: r,
        }) => ({
          a: e,
          b: t,
          p: n,
          s: a,
          r: s,
          t: { limit: { tif: i } },
          ...(void 0 !== r && { c: r }),
        }),
        actionOrder: ({ orders: e }) => ({
          type: "order",
          orders: e,
          grouping: "na",
        }),
        cancelCloid: ({ asset: e, cloid: t }) => ({ asset: e, cloid: t }),
        actionCancelCloid: ({ cancels: e }) => ({
          type: "cancelByCloid",
          cancels: e,
        }),
        actionSetReferrer: ({ code: e }) => ({ type: "setReferrer", code: e }),
        actionSpotClearinghouseState: ({ user: e }) => ({
          type: "spotClearinghouseState",
          user: e,
        }),
        actionApproveAgent: ({ agentAddress: e, agentName: t, nonce: a }) => ({
          type: "approveAgent",
          hyperliquidChain: n ? "Mainnet" : "Testnet",
          signatureChainId: (n, c(l[n])),
          agentAddress: e,
          agentName: t,
          nonce: a,
        }),
      },
      signing: {
        PHANTOM_DOMAIN: {
          name: "Exchange",
          version: "1",
          chainId: 1337,
          verifyingContract: "0x0000000000000000000000000000000000000000",
        },
        AGENT_TYPES: {
          Agent: [
            { name: "source", type: "string" },
            { name: "connectionId", type: "bytes32" },
          ],
        },
        actionHash({ activePool: e, action: t, nonce: n }) {
          const a = MessagePack.encode(t),
            s = new Uint8Array(a.length + (void 0 === e ? 9 : 29));
          s.set(a);
          const i = new DataView(s.buffer);
          return (
            i.setBigUint64(a.length, BigInt(n), !1),
            void 0 === e
              ? i.setUint8(a.length + 8, 0)
              : (i.setUint8(a.length + 8, 1),
                s.set(ethers.getBytes(e), a.length + 9)),
            ethers.keccak256(s)
          );
        },
        async signInnerAsync({ wallet: t, message: n }) {
          const {
            r: a,
            s: s,
            v: i,
          } = ethers.Signature.from(
            await t.signTypedData(
              e.signing.PHANTOM_DOMAIN,
              e.signing.AGENT_TYPES,
              n,
            ),
          );
          return { r: a, s: s, v: i };
        },
        signL1ActionAsync: async ({
          isMainnet: t,
          wallet: n,
          activePool: a,
          action: s,
          nonce: i,
        }) =>
          await e.signing.signInnerAsync({
            wallet: n,
            message: {
              source: t ? "a" : "b",
              connectionId: e.signing.actionHash({
                activePool: a,
                action: s,
                nonce: i,
              }),
            },
          }),
        async signWalletL1ActionAsync({ isMainnet: e, wallet: t, action: a }) {
          const {
            r: s,
            s: i,
            v: r,
          } = ethers.Signature.from(
            await window.ethereum.request({
              method: "eth_signTypedData_v4",
              params: [
                t.address,
                JSON.stringify({
                  types: {
                    EIP712Domain: [
                      { name: "name", type: "string" },
                      { name: "version", type: "string" },
                      { name: "chainId", type: "uint256" },
                      { name: "verifyingContract", type: "address" },
                    ],
                    "HyperliquidTransaction:ApproveAgent": [
                      { name: "hyperliquidChain", type: "string" },
                      { name: "agentAddress", type: "address" },
                      { name: "agentName", type: "string" },
                      { name: "nonce", type: "uint64" },
                    ],
                  },
                  domain: {
                    name: "HyperliquidSignTransaction",
                    version: "1",
                    chainId: l[n],
                    verifyingContract:
                      "0x0000000000000000000000000000000000000000",
                  },
                  primaryType: "HyperliquidTransaction:ApproveAgent",
                  message: a,
                }),
              ],
            }),
          );
          return { r: s, s: i, v: r };
        },
      },
      requests: {
        payloadExchangeAsync: async ({
          isMainnet: t,
          wallet: n,
          subaccount: a,
          action: s,
          nonce: i,
        }) => ({
          action: s,
          nonce: i,
          signature: await e.signing.signL1ActionAsync({
            isMainnet: t,
            wallet: n,
            activePool: a,
            action: s,
            nonce: i,
          }),
          vaultAddress: a,
        }),
        payloadExchangeWalletAsync: async ({
          isMainnet: t,
          wallet: n,
          action: a,
          nonce: s,
        }) => ({
          action: a,
          nonce: s,
          signature: await e.signing.signWalletL1ActionAsync({
            isMainnet: t,
            wallet: n,
            action: a,
          }),
        }),
        wsMsg: ({ id: e, type: t, payload: n }) =>
          JSON.stringify({
            method: "post",
            id: e,
            request: { type: t, payload: n },
          }),
        postAsync: async ({ url: e, endpoint: t, payload: n }) =>
          await fetch(e + t, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(n),
          }).then((e) => {
            if (e.ok) return e.json();
            throw new Error("HTTP error");
          }),
        postInfoAsync: async ({ url: t, payload: n }) =>
          await e.requests.postAsync({ url: t, endpoint: "/info", payload: n }),
        postExchangeAsync: async ({ url: t, payload: n }) =>
          await e.requests.postAsync({
            url: t,
            endpoint: "/exchange",
            payload: n,
          }),
      },
    },
    t = {
      import: {
        keyToWallet(e) {
          if (null !== e && "" !== e)
            try {
              return new ethers.Wallet(e);
            } catch {
              return null;
            }
        },
        washAddress: null,
        washBalance: null,
        sniperAddress: null,
        sniperBalance: null,
        agentWallet: null,
      },
      sniper: {
        async queueBuys(r, o) {
          const l = e.actions.actionOrder({
            orders: [
              e.actions.orderLimit({
                asset: s,
                isBid: !0,
                price: e.math.priceToOrderString(r, a),
                size: e.math.sizeToOrderString(n ? 1e6 : 1e3, a),
                isReduce: !1,
                tif: "Ioc",
              }),
            ],
          });
          for (let a = 0; a < o; a++) {
            const s = await e.requests.payloadExchangeAsync({
                isMainnet: n,
                wallet: t.import.agentWallet,
                action: l,
                nonce: Date.now() + a,
              }),
              r = e.requests.wsMsg({ id: i++, type: "action", payload: s });
            t.sniper.orders.push(r);
          }
        },
        async queueSells(r, o) {
          const l = e.actions.actionOrder({
            orders: [
              e.actions.orderLimit({
                asset: s,
                isBid: !1,
                price: e.math.priceToOrderString(r, a),
                size: e.math.sizeToOrderString(1e3, a),
                isReduce: !1,
                tif: "Gtc",
              }),
            ],
          });
          for (let a = 0; a < o; a++) {
            const s = await e.requests.payloadExchangeAsync({
                isMainnet: n,
                wallet: t.import.agentWallet,
                action: l,
                nonce: Date.now() + a,
              }),
              r = e.requests.wsMsg({ id: i++, type: "action", payload: s });
            t.sniper.orders.push(r);
          }
        },
        queueClear() {
          t.sniper.orders = [];
        },
        async snipe(e) {
          const t = await d(),
            a = Math.max(18e4 / (t + 1), 40);
          e = e.slice(0);
          const s = new WebSocket(o[n]);
          s.addEventListener("message", console.log),
            s.addEventListener("open", () => {
              let t = 0;
              const n = setInterval(function () {
                t >= e.length ? window.clearInterval(n) : s.send(e[t++]);
              }, a);
            });
        },
        async snipeExecute() {
          const e = t.sniper.orders;
          e.length > 0 && (t.sniper.queueClear(), await t.sniper.snipe(e));
        },
        async snipeAt(e, n) {
          const a = t.sniper.orders;
          if (a.length > 0) {
            document
              .querySelectorAll("button")
              .forEach((e) => (e.disabled = !0)),
              t.sniper.queueClear(),
              console.log(e);
            const s = setInterval(async function () {
              const i = e - Date.now();
              if (i <= 0)
                return window.clearInterval(s), void (await t.sniper.snipe(a));
              n.value = `This will execute ${a.length} orders after ${Math.floor(i / 1e3)} seconds`;
            }, 1e3);
          }
        },
        orders: [],
      },
    };
  var n = !0;
  const a = 0,
    s = 1e4 + (n ? 93 : 577);
  var i = 0;
  const r = {
      false: "https://api.hyperliquid-testnet.xyz",
      true: "https://api.hyperliquid.xyz",
    },
    o = {
      false: "wss://api.hyperliquid-testnet.xyz/ws",
      true: "wss://api.hyperliquid.xyz/ws",
    },
    l = { false: 421614, true: 42161 };
  function c(e) {
    return `0x${e.toString(16)}`;
  }
  async function p(e) {
    const t = await window.ethereum.request({ method: "eth_requestAccounts" });
    return (
      window.ethereum.networkVersion !== e &&
        (await (async function (e) {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: c(e) }],
          });
        })(e)),
      t
    );
  }
  async function u(a) {
    const s = await e.requests.postInfoAsync({
      url: r[n],
      payload: e.actions.actionSpotClearinghouseState({
        user: t.import.washAddress,
      }),
    });
    for (let e of s.balances) if (e.token === a) return e.total;
    return "0";
  }
  async function d() {
    try {
      const e = await u(67);
      return (
        (t.import.washBalance = e),
        (h.step1.input.washBalance.element.value = e),
        (h.step1.button.washBalanceRefresh.element.disabled = !1),
        e
      );
    } catch (e) {
      console.log("Hyperliquid Error: failed to fetch $WASH balance", e);
    }
  }
  async function g() {
    try {
      const e = await u(0);
      return (
        (t.import.sniperBalance = e),
        (h.step1.input.sniperBalance.element.value = e),
        (h.step1.button.sniperBalanceRefresh.element.disabled = !1),
        e
      );
    } catch (e) {
      console.log("Hyperliquid Error: failed to fetch $WASH balance", e);
    }
  }
  const m = `$WASH sniper login (${n ? "Mainnet" : "Testnet"})\n\nSign this message to login and confirm ownership of the $WASH in this wallet.\n\nDo **not** share the signature generated by this message with anyone else, or they will have access to your Sniper wallet.`,
    y = "washSniperAgent",
    h = {
      step1: {
        button: {
          washLogin: {
            async click(e) {
              try {
                const e = await p(l[n]),
                  a = await window.ethereum.request({
                    method: "personal_sign",
                    params: [m, e[0]],
                  });
                t.import.washAddress = e[0];
                const s = a.slice(0, 65) + "a";
                if (66 !== s.length) throw new Error("bad key");
                (t.import.agentWallet = t.import.keyToWallet(s)),
                  (h.step1.input.washAddress.element.value =
                    t.import.washAddress),
                  (h.step1.button.washCopy.element.disabled = !1),
                  (h.step1.button.sniperConnect.element.disabled = !1),
                  await d();
              } catch (e) {
                console.log("Wallet Error: failed to connect $WASH wallet", e);
              }
            },
          },
          washCopy: {
            click(e) {
              navigator.clipboard.writeText(
                h.step1.input.washAddress.element.value,
              );
            },
          },
          washBalanceRefresh: {
            async click(e) {
              await d();
            },
          },
          sniperConnect: {
            async click(e) {
              try {
                const e = await p(l[n]);
                (t.import.sniperAddress = e[0]),
                  (h.step1.input.sniperAddress.element.value =
                    t.import.sniperAddress),
                  (h.step1.button.sniperCopy.element.disabled = !1),
                  (h.step1.button.sniperEnable.element.disabled = !1),
                  (h.step1.button.sniperDisable.element.disabled = !1),
                  await g();
              } catch (e) {
                console.log("Wallet Error: failed to connect sniper wallet", e);
              }
            },
          },
          sniperCopy: {
            click(e) {
              navigator.clipboard.writeText(
                h.step1.input.sniperAddress.element.value,
              );
            },
          },
          sniperBalanceRefresh: {
            async click(e) {
              await g();
            },
          },
          sniperEnable: {
            async click(a) {
              const s = t.import.agentWallet.address.toLowerCase();
              if (42 === s.length) {
                const a = Date.now();
                await e.requests.postExchangeAsync({
                  url: r[n],
                  payload: await e.requests.payloadExchangeWalletAsync({
                    isMainnet: n,
                    wallet: { address: t.import.sniperAddress },
                    action: e.actions.actionApproveAgent({
                      agentAddress: s,
                      agentName: `${y} valid_until ${Date.now() + 864e5}`,
                      nonce: a,
                    }),
                    nonce: a,
                  }),
                }),
                  (h.step1.msg.errorDuplicateSniper.element.innerHTML =
                    "Enabled sniper"),
                  h.step1.msg.errorDuplicateSniper.element.classList.remove(
                    "error",
                  ),
                  (h.step1.msg.errorDuplicateSniper.element.style.visibility =
                    "visible"),
                  (h.step2.button.queueBuys.element.disabled = !1),
                  (h.step2.button.queueSells.element.disabled = !1),
                  (h.step2.button.queueClear.element.disabled = !1);
              } else
                console.log("faulty agent address"),
                  (h.step1.msg.errorDuplicateSniper.element.innerHTML =
                    "agent address error"),
                  h.step1.msg.errorDuplicateSniper.element.classList.add(
                    "error",
                  ),
                  (h.step1.msg.errorDuplicateSniper.element.style.visibility =
                    "visible");
            },
          },
          sniperDisable: {
            async click(a) {
              const s = Date.now();
              await e.requests.postExchangeAsync({
                url: r[n],
                payload: await e.requests.payloadExchangeWalletAsync({
                  isMainnet: n,
                  wallet: { address: t.import.sniperAddress },
                  action: e.actions.actionApproveAgent({
                    agentAddress: "0x" + "0".repeat(40),
                    agentName: `${y} valid_until ${Date.now() + 864e5}`,
                    nonce: s,
                  }),
                  nonce: s,
                }),
              }),
                (h.step1.msg.errorDuplicateSniper.element.innerHTML =
                  "Disabled sniper"),
                h.step1.msg.errorDuplicateSniper.element.classList.add("error"),
                (h.step1.msg.errorDuplicateSniper.element.style.visibility =
                  "visible");
            },
          },
        },
        input: {
          washAddress: {},
          washBalance: {},
          sniperAddress: {},
          sniperBalance: {},
        },
        msg: { errorDuplicateSniper: {} },
      },
      step2: {
        button: {
          queueBuys: {
            async click(e) {
              if (null !== t.import.agentWallet) {
                const n = parseFloat(
                    h.step2.input.orderMarketCap.element.value,
                  ),
                  a = parseFloat(h.step2.input.orderNumber.element.value);
                h.step2.input.orderMarketCap.element.value = "";
                const s = n / 1e9;
                if (isNaN(n) || isNaN(s) || isNaN(a)) return;
                if (n <= 1e3 || s <= 0 || a <= 0) return;
                try {
                  await t.sniper.queueBuys(s, a),
                    (h.step2.input.queueSummary.element.value = `You have ${t.sniper.orders.length} orders queued`),
                    (h.step2.textArea.queueList.element.value += `\nBUY  | MC: ${n} (Price: ${s}) Num: ${a}`);
                } catch (e) {
                  console.log(e);
                }
              }
            },
          },
          queueSells: {
            async click(e) {
              if (null !== t.import.agentWallet) {
                const n = parseFloat(
                    h.step2.input.orderMarketCap.element.value,
                  ),
                  a = parseFloat(h.step2.input.orderNumber.element.value);
                h.step2.input.orderMarketCap.element.value = "";
                const s = n / 1e9;
                if (isNaN(n) || isNaN(s) || isNaN(a)) return;
                if (n <= 1e3 || s <= 0 || a <= 0) return;
                try {
                  t.sniper.queueSells(s, a),
                    (h.step2.input.queueSummary.element.value = `You have ${t.sniper.orders.length} orders queued`),
                    (h.step2.textArea.queueList.element.value += `\nSELL | MC: ${n} (Price: ${s}) Num: ${a}`);
                } catch (e) {
                  console.log(e);
                }
              }
            },
          },
          queueClear: {
            async click(e) {
              t.sniper.queueClear(),
                (h.step2.input.queueSummary.element.value =
                  "You have 0 orders queued"),
                (h.step2.textArea.queueList.element.value = "");
            },
          },
        },
        input: { orderMarketCap: {}, orderNumber: {}, queueSummary: {} },
        textArea: { queueList: {} },
      },
      step3: {
        button: {
          executeNow: {
            async click(e) {
              await t.sniper.snipeExecute(),
                (h.step2.input.queueSummary.element.value =
                  "You have 0 orders queued"),
                (h.step2.textArea.queueList.element.value = "");
            },
          },
          executeTimed: {
            async click(e) {
              const n = Date.parse(
                `${new Date().toISOString().slice(0, 10)}T${h.step3.input.timeStart.element.value}.000Z`,
              );
              await t.sniper.snipeAt(n, h.step3.input.countdown.element),
                (h.step2.input.queueSummary.element.value =
                  "You have 0 orders queued"),
                (h.step2.textArea.queueList.element.value = "");
            },
          },
        },
        input: { timeStart: {}, timeEnd: {}, countdown: {} },
        msg: { msgExecuting: {} },
      },
    };
  for (let e in h)
    for (let t in h[e])
      for (let n in h[e][t]) {
        const a = h[e][t][n];
        (a.element = document.getElementById(n)),
          "button" === t && a.element.addEventListener("click", a.click);
      }
})();
