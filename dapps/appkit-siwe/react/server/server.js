import cors from 'cors';
import express from 'express';
import { generateNonce } from 'siwe';
import {
  verifySignature,
  getAddressFromMessage,
  getChainIdFromMessage,
} from '@reown/appkit-siwe'


// get env variables
import dotenv from 'dotenv';

// get Project ID
const projectId = process.env.PROJECT_ID;

const app = express();

// configure cors
app.use(cors({
  origin: 'http://localhost:5174', // frontend URL
  credentials: true,
}))
app.use(express.json())

// generate a nonce
app.get('/nonce', function (_, res) {
    res.setHeader('Content-Type', 'text/plain');
    console.log("/nonce");
    res.send(generateNonce());
});

// verify the message
app.post('/verify', async (req, res) => {
    try {
      if (!req.body.message) {
        return res.status(400).json({ error: 'SiweMessage is undefined' });
      }
      const message = req.body.message;

      const address = getAddressFromMessage(message);
      let chainId = getChainIdFromMessage(message);
      
      const isValid = await verifySignature({
        address,
        message,
        signature: req.body.signature,
        chainId,
        projectId,
      });

      if (!isValid) {
        // throw an error if the signature is invalid
        throw new Error('Invalid signature');
      }
      if (chainId.includes(":")) {
        chainId = chainId.split(":")[1];
      }
      // Convert chainId to a number
      chainId = Number(chainId);

      if (isNaN(chainId)) {
          throw new Error("Invalid chainId");
      }
      
      res.status(200).send({
        address,
        chainId
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

// start the server
const listener = app.listen(8080, () =>
	console.log('Listening on port ' + listener.address().port),
);