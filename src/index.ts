import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import axios from "axios";

interface AguardandoCep {
  [key: string]: boolean;
}

interface AguardandoOpcao {
  [key: string]: boolean;
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

let esperaCep: AguardandoCep = {};
let esperaOpcao: AguardandoOpcao = {};

client.on("qr", (qr: string) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

const getCep = async (cep: string) => {
  try {
    const res = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    return res.data;
  } catch (error) {
    console.error("Erro ao consultar o CEP:", error);
    return null;
  }
};

client.on("message", async (message: Message) => {
  if (message.fromMe) return;

  if (esperaOpcao[message.from]) {
    if (message.body === "1") {
      client.sendMessage(message.from, "Digite um novo CEP.");
      esperaCep[message.from] = true;
    } else if (message.body === "2") {
      client.sendMessage(
        message.from,
        "OK. Caso queira buscar novamente digite ( !cep )"
      );
    } else {
      client.sendMessage(
        message.from,
        "Opção inválida. Digite 1 para buscar um novo CEP ou 2 para parar."
      );
    }
    delete esperaOpcao[message.from];
    return;
  }

  if (message.body === "!cep") {
    client.sendMessage(message.from, "Olá, digite um CEP no formato 12345-678");
    esperaCep[message.from] = true;
  } else if (esperaCep[message.from]) {
    const cep = message.body.replace(/\D/g, "");

    if (cep.length === 8) {
        const cepInfo = await getCep(cep);
        if (cepInfo && !cepInfo.erro) {
            client.sendMessage(message.from, 
                `CEP: ${cepInfo.cep}\n` +
                `Rua: ${cepInfo.logradouro}\n` +
                `Bairro: ${cepInfo.bairro}\n` +
                `Cidade: ${cepInfo.localidade}\n` +
                `Estado: ${cepInfo.uf}\n\n` +
                'Deseja buscar outro CEP ou parar? Digite 1 para buscar um novo CEP ou 2 para parar.'
            );
        } else {
            client.sendMessage(message.from, 'CEP não encontrado ou inválido. Por favor, verifique e tente novamente.');
        }

        esperaOpcao[message.from] = true;
        delete esperaCep[message.from]; 
    } else {
        client.sendMessage(message.from, 'Por favor, digite um CEP válido com 8 dígitos no formato 12345678');
    }
  }
});

client.initialize();
