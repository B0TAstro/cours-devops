'use strict';

const REFILL_PER_SECOND = 1;
const BUCKET_SIZE = 15;
const REQUEST_COST = 3;

const DEFAULT_CONFIG = {
  refillPerSecond: REFILL_PER_SECOND,
  bucketSize: BUCKET_SIZE,
  requestCost: REQUEST_COST
};

function elapsedSeconds(since, now) {
  return Math.floor((now - since) / 1000);
}

function consume(state, now, config = DEFAULT_CONFIG) {
  const { refillPerSecond, bucketSize, requestCost } = config;

  // never seen: a full bucket, minus this request
  if (!state) {
    return {
      allowed: true,
      state: { updatedAt: now, tokens: bucketSize - requestCost }
    };
  }
  // enough left to pay: spend it and leave updatedAt alone
  if (state.tokens >= requestCost) {
    return {
      allowed: true,
      state: { updatedAt: state.updatedAt, tokens: state.tokens - requestCost }
    };
  }
  // not enough: credit what the elapsed seconds are worth, up to the ceiling
  const refilled = Math.min(
    bucketSize,
    state.tokens + elapsedSeconds(state.updatedAt, now) * refillPerSecond
  );
  if (refilled < requestCost) {
    return { allowed: false, state };
  }
  return {
    allowed: true,
    state: { updatedAt: now, tokens: refilled - requestCost }
  };
}

module.exports = {
  consume,
  REFILL_PER_SECOND,
  BUCKET_SIZE,
  REQUEST_COST
};
