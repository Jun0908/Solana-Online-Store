import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import products from "./products.json";

// このアドレスを販売者のウォレットアドレスに置き換えてください。（ここでは販売者＝あなたです。）
const sellerAddress = '5AAtY5PQxNB7MTBNGT1e2Bb1R4nYKevZoZDzvduzGnMj'
const sellerPublicKey = new PublicKey(sellerAddress);

const createTransaction = async (req, res) => {
  try {
    // リクエストからトランザクションデータを抽出します。
    const { buyer, orderID, itemID } = req.body;

    // 必要なものがない場合は中止します。
    if (!buyer) {
      return res.status(400).json({
        message: "Missing buyer address",
      });
    }

    if (!orderID) {
      return res.status(400).json({
        message: "Missing order ID",
      });
    }

    // products.jsonからitemIDで商品価格を取得します。
    const itemPrice = products.find((item) => item.id === itemID).price;

    if (!itemPrice) {
      return res.status(404).json({
        message: "Item not found. please check item ID",
      });
    }

    // 価格を適切な形式に変換します。
    const bigAmount = BigNumber(itemPrice);
    const buyerPublicKey = new PublicKey(buyer);
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint);

    // 各ブロックを識別するblockhashはblockのIDのようなものです。
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    // トランザクションには直近のブロックIDと料金支払者の公開鍵の2つが必要です。
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey,
    });

    // トランザクションによりSOLを送金します。
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: buyerPublicKey,
      // LamportsはSOLの最小単位で、EthereumにおけるGweiにあたります。
      lamports: bigAmount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
      toPubkey: sellerPublicKey,
    });

    // トランザクションにさらに命令を追加します。
    transferInstruction.keys.push({
      // あとでOrderIdを使用してこのトランザクションを検索します。
      pubkey: new PublicKey(orderID),
      isSigner: false,
      isWritable: false,
    });

    tx.add(transferInstruction);

    // トランザクションのフォーマットを設定します。
    const serializedTransaction = tx.serialize({
      requireAllSignatures: false,
    });
    const base64 = serializedTransaction.toString("base64");

    res.status(200).json({
      transaction: base64,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({ error: "error creating tx" });
    return;
  }
}

export default function handler(req, res) {
  if (req.method === "POST") {
    createTransaction(req, res);
  } else {
    res.status(405).end();
  }
}