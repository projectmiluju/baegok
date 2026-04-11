import { Kafka, type Producer } from "kafkajs";
import { getEnv } from "./env";

export const TOPIC_COMMIT_ANALYSIS = "commit-analysis";

let producer: Producer | null = null;
let connectingPromise: Promise<Producer> | null = null;

/**
 * Kafka Producer 싱글톤.
 * 동시 호출 시 중복 connect를 방지하기 위해 in-flight promise로 가드한다.
 */
export async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    const env = getEnv();
    const kafka = new Kafka({
      clientId: "baegok-api",
      brokers: env.KAFKA_BROKERS.split(","),
    });

    const p = kafka.producer();
    await p.connect();
    producer = p;
    connectingPromise = null;
    return p;
  })();

  return connectingPromise;
}

/** 테스트/graceful shutdown 용 */
export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
