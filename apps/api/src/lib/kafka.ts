import { Kafka, type Producer } from "kafkajs";
import { getEnv } from "./env";

export const TOPIC_COMMIT_ANALYSIS = "commit-analysis";

let producer: Producer | null = null;

/**
 * Kafka Producer 싱글톤.
 * 첫 호출 시 connect, 이후 재사용.
 */
export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const env = getEnv();
  const kafka = new Kafka({
    clientId: "baegok-api",
    brokers: env.KAFKA_BROKERS.split(","),
  });

  producer = kafka.producer();
  await producer.connect();
  return producer;
}

/** 테스트/graceful shutdown 용 */
export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
