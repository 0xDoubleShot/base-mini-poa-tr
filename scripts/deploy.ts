import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("POA");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("POA deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
