// fetchProducts.js

import products from "./products.json"

export default function handler(req, res) {
  if (req.method === "GET") {
    // リクエストを受け取った場合、ハッシュとファイル名を除いた製品のコピーを作成します。（配列）
    const productsNoHashes = products.map((product) => {

      const { hash, filename, ...rest } = product;
      return rest;
    });

    res.status(200).json(productsNoHashes);
  }
  else {
    res.status(405).send(`Method ${req.method} not allowed`);
  }
}