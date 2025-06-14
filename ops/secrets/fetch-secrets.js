const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

(async () => {
  const names = process.argv.slice(2);
  const client = new SSMClient({});
  const command = new GetParametersCommand({
    Names: names,
    WithDecryption: true,
  });
  const { Parameters } = await client.send(command);
  const out = {};
  for (const p of Parameters || []) {
    out[p.Name] = p.Value;
  }
  console.log(JSON.stringify(out));
})();
