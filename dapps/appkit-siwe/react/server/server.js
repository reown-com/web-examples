import cors from 'cors';
import express from 'express';
import Session from 'express-session';
import { generateNonce } from 'siwe';
import {
  verifySignature,
  getAddressFromMessage,
  getChainIdFromMessage,
} from '@reown/appkit-siwe'

const app = express();

// configure cors and sessions
app.use(cors({
  origin: 'http://localhost:5174', // frontend URL
  credentials: true,
}))
app.use(express.json())
app.use(Session({
  name: 'siwe-quickstart',
  secret: "siwe-quickstart-secret",
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, sameSite: true }
}));

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
      const chainId = getChainIdFromMessage(message);
      
      const isValid = await verifySignature({
        address,
        message,
        signature: req.body.signature,
        chainId,
        projectId: "...",
      });
      if (!isValid) {
        // throw an error if the signature is invalid
        throw new Error('Invalid signature');
      }
      
      // save the session with the address and chainId (SIWESession)
      req.session.siwe = { address, chainId };
      console.log("/verify");
      req.session.save(() => res.status(200).send(true));
    } catch (e) {
      // clean the session
      req.session.siwe = null;
      req.session.nonce = null;
      req.session.save(() => res.status(500).json({ message: e.message }));
    }
  });

  // get the session
  app.get('/session', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log("/session");
    res.send(req.session.siwe);
  });

  // signout and clean the session
  app.get('/signout', (req, res) => {
    req.session.siwe = null;
    req.session.nonce = null;
    console.log("/singout");
    req.session.save(() => res.send({}));
  });

// start the server
const listener = app.listen(8080, () =>
	console.log('Listening on port ' + listener.address().port),
);