# Code runner (Piston) for TieEdu

TieEdu runs students' code (TCS NQT coding: C, C++, Java, Python) on a Piston server. The backend talks to it through `PISTON_API_URL` (see `backend/src/lib/codeRunner.ts`).

The server is the Piston instance on Azure that ContestOS already uses (port 2000).

## 1. Check it is up

From any machine:

```bash
curl -s http://<azure-ip>:2000/api/v2/runtimes
```

You should get a JSON list. If the connection is refused or times out:

- **Azure portal → the VM → Overview**: the VM must be *Running*, not *Stopped (deallocated)*.
- **Azure portal → the VM → Networking**: add an inbound rule for **TCP 2000**. Allow it **only from the TieEdu backend server's IP**, not from "Any": an open runner can be abused by anyone.
- **On the VM**: run `docker ps` and look for the piston container. If it is not running, start it with `docker start piston_api` (or your container's name).

## 2. Make sure the four languages are installed

The list from step 1 must include `c`, `c++` (gcc), `java` and `python`. If one is missing, install it on the VM:

```bash
curl -s -X POST http://localhost:2000/api/v2/packages -H 'Content-Type: application/json' -d '{"language":"gcc","version":"10.2.0"}'
curl -s -X POST http://localhost:2000/api/v2/packages -H 'Content-Type: application/json' -d '{"language":"java","version":"15.0.2"}'
curl -s -X POST http://localhost:2000/api/v2/packages -H 'Content-Type: application/json' -d '{"language":"python","version":"3.10.0"}'
```

`gcc` provides both C and C++. Use the versions your Piston lists under `GET /api/v2/packages`.

## 3. Point TieEdu at it

In the backend `.env` on the TieEdu server:

```
PISTON_API_URL=http://<azure-ip>:2000/api/v2
```

Then restart the backend.

## 4. Try it

- Open `/code`, pick a problem, and press **Run samples**.
- To check the whole set, run the reference solutions from the backend folder:

  ```bash
  PISTON_API_URL=http://<azure-ip>:2000/api/v2 npx ts-node --transpile-only scripts/verifyCodingSolutions.live.ts
  ```

  This runs every problem's C++, Java and Python solution against all of its tests on the real runner. It is also how the C++ solutions get compiled and checked for the first time.

## Limits the backend sets on every run

| Limit | Value |
|---|---|
| Run time | 3 s |
| Compile time | 10 s |
| Memory | 256 MB |
| Code size | 64 KB |
| Output kept | 64 KB |
| Rate | 20 runs or submits per student per minute |

Untrusted code never runs on the TieEdu server itself. There is no local fallback, unlike ContestOS.
