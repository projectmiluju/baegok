# ADR-007: Docker Compose on EC2 (K8s 제외)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

EKS(Kubernetes)로 오케스트레이션하는 방안도 검토했으나,
D-6 제약과 MVP 규모를 고려하여 인프라 복잡도를 결정해야 한다.

## 고려한 선택지

### 선택지 A: Kubernetes (EKS)
- 장점: 오토스케일링, 롤링 배포, 헬스체크 자동화
- 단점: EKS 세팅 1~2일, 비용 높음, MVP 규모에 과잉

### 선택지 B: Docker Compose on EC2
- 장점: 30분 내 배포 가능, 비용 낮음, 구조 단순
- 단점: 수동 스케일링, 장애 시 수동 복구

## 결정 (Decision)

**선택지 B: Docker Compose on EC2.**
D-6에 K8s를 세팅하면 실제 기능 개발 시간이 부족하다.
MVP 규모에서 트래픽은 극소수이므로 오토스케일링이 불필요하다.
GitHub Actions로 main 머지 시 EC2에 자동 배포하면 충분하다.

## 결과 (Consequences)

- 긍정적: 빠른 배포, 낮은 비용, 단순한 구조
- 부정적: 수동 스케일링, 단일 장애점(EC2 1대)
- 리스크: 트래픽 급증 시 대응 불가 (MVP 단계에서는 문제 없음)

## 되돌릴 조건 (Reversal Triggers)

- 사용자가 100명 이상이 되면 ECS Fargate 또는 K8s 전환 검토
