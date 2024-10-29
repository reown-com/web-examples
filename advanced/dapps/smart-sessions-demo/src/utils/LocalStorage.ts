"use client";
import { bigIntReplacer } from "./CommonUtils";

export const LAST_USED_ADDRESS_KEY = "lastUsedAddress";
export const DCA_APP_DATA = "dca";
export const TICTACTOE_APP_DATA = "tictactoe";

/**
 * Sets an item in the local storage.
 * @param key - The key to set the item with.
 * @param value - The value to be stored. It will be converted to a string using JSON.stringify.
 * @template T - The type of the value being stored.
 */
function setItem<T>(key: string, value: T) {
  // To prevent silly mistakes with double stringifying
  if (typeof value === "string") {
    localStorage.setItem(key, value);
  } else {
    localStorage?.setItem(key, JSON.stringify(value, bigIntReplacer));
  }
}

/**
 * Retrieves the value associated with the specified key from the local storage.
 *
 * @param key - The key of the item to retrieve.
 * @returns The value associated with the key, or null if the key does not exist.
 */
function getItem(key: string): string | null {
  return localStorage.getItem(key);
}

function removeItem(key: string) {
  localStorage.removeItem(key);
}

export type PasskeyLocalStorageFormat = {
  rawId: string;
  pubkeyCoordinates: {
    x: string;
    y: string;
  };
};
export { setItem, getItem, removeItem };
