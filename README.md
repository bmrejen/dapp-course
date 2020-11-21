# Dapp Course

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Installation (Windows instructions)

Uninstall other versions of Truffle
`npm i -g node-gyp@3.6.2 create-react-app@2.1.3 truffle@5.0.5`

Install Python2.7
`choco install python2`

## Usage

1. For development mode, launch Ganache and report your local IP and port to `truffle-config.js`

2. Install dependencies

`npm i`

3. Compile your smart contracts to src/abis

`truffle compile`

4. Deploy them to the blockchain. Migration files will be run alphabetically

`truffle migrate`

5. Check the result and the address of the account that was charged (usually the first one in Ganache)

`truffle console`

And once inside the console:

`const token = await Token.deployed();`

`token.address`

`token.name`

## Testing 

1. Run your test files

`truffle test`

## Troubleshooting

If the project doesn't work:
1. Only keep Python2.7 and remove other versions

`choco uninstall python`

`choco uninstall python3`

Run appwiz.cpl and uninstall Python versions.

You might need to manually delete executable files 

2. Remove other versions of NodeJS. Only keep 9.10.0

`nvm list`

`nvm uninstall`

3. Install build tools

You can either do

`npm install --global --production windows-build-tools`

or follow instructions here: https://www.npmjs.com/package/node-gyp/v/3.6.2

4. Set MSVS version and Python version

`npm config set msvs_version 2015`

`npm config set python "C:\Python27"`

5. Create empty binding.cc at root

6. Create binding.gyp at root

```
{
    "targets": [
    {
      "target_name": "binding",
      "sources": [ "src/binding.cc" ]
    }
  ]
}
```

7. Check your Windows environment variables for Python27

