// One plain sentence per custom error: prd.md §9.1, §10.5
import { dogeNum, usd, utc } from "./format";

export type SoothError =
  | { name: "NoActiveStop" }
  | { name: "StopExpired"; expiry: number }
  | { name: "PriceAboveStop"; price: number; stopPrice: number }
  | { name: "PriceOlderThanArm"; priceTs: number; armedAt: number }
  | { name: "BelowGasFloor"; balance: number; amount: number; gasFloor: number }
  | { name: "GasFloorTooLow" }
  | { name: "BadAmount" }
  | { name: "SignerOrTimestamp" }
  | { name: "VenueInsolvent" }
  | { name: "Unknown" };

export function explain(e: SoothError): string {
  switch (e.name) {
    case "NoActiveStop":
      return "Not sold: this holder has no active stop.";
    case "StopExpired":
      return `Not sold: this stop expired on ${utc(e.expiry)}.`;
    case "PriceAboveStop":
      return `Not sold: DOGE/USD ${usd(e.price)} is above the stop ${usd(e.stopPrice)}.`;
    case "PriceOlderThanArm":
      return "Not sold: the signed price is from before the stop was armed.";
    case "BelowGasFloor":
      return `Not sold: the holder has ${dogeNum(e.balance)} DOGE, and selling ${dogeNum(
        e.amount,
      )} would leave less than the ${dogeNum(e.gasFloor)} floor.`;
    case "GasFloorTooLow":
      return "The gas floor must be at least 1 DOGE.";
    case "BadAmount":
      return "Enter an amount above 0 DOGE.";
    case "SignerOrTimestamp":
      return "Not sold: the price package was not signed by 3 authorised signers, or was more than 60 seconds old.";
    case "VenueInsolvent":
      return "Not sold: the testnet backstop is out of payout tokens. No DOGE moved.";
    case "Unknown":
      return "Not sold: the transaction reverted with a reason Sooth does not recognise.";
  }
}
