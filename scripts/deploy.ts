import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("POA");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("POA deployed to:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

