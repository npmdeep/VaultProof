import axios from 'axios';

async function main() {
  const address = 'mn_addr_preview1ppsp5mneyx3v9sd3r4g2t6tdypsk3ayjfx78enx9x68p9gn72xhqs2kxkq';
  const query = `
    query {
      contractState(address: "${address}") {
        balance
      }
    }
  `;
  try {
    const res = await axios.post('https://indexer.preview.midnight.network/api/v4/graphql', {
      query: `
        query {
          unshieldedCoins(filter: {address: {equalTo: "${address}"}}) {
            nodes {
              coinPublicKey
              value
            }
          }
        }
      `
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
