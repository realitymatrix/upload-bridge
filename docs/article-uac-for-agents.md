# UAC for AI Agents

*By Petr Korolev*

Twenty years ago, Windows faced a problem: programs ran with the full authority of the person who launched them. Any application could touch anything. The answer was User Account Control: when a program wants to do something consequential, the operating system, not the program, draws a prompt, shows you what is actually being requested, and waits for your click. The program can ask. Only you can consent.

AI agents have brought this exact problem back, and we are handling it worse than 2006 did.

## The problem

Agents now drive browsers, file systems, and applications on our behalf. They fill forms, send messages, move files. And the standard way they get permission is text in a chat window: "Should I proceed?" followed by "yes."

Text consent is broken in a way that is easy to miss. The agent renders the question. If the agent is compromised, and prompt injection means any agent that reads untrusted content can be, then the question itself is compromised. A hijacked agent can display "Upload resume.pdf to the job application?" while actually sending your tax records to a server it was instructed to contact by a hostile web page. Your "yes" is real. What you said yes to is not.

I hit this problem building something mundane: an agent that helps with job applications. It filled forms beautifully, then hit a file upload and asked me to click the dialog myself. I asked it to bypass the sandbox with JavaScript. It refused, and its reasoning stuck with me: an agent that pushes files into web pages when politely asked will also do it when a malicious page asks politely. Then it proposed something better, and we built it that evening.

## The solution shape

The fix is the same one UAC found, and it fits in four sentences:

1. **Agents request; they never consent.** The agent's only capability is asking.
2. **Consent is rendered by trusted code the agent cannot draw or click,** a native OS dialog, outside the agent's reach.
3. **Consent binds to the true object.** The dialog shows the actual resolved file, the actual destination, not the agent's description of them.
4. **Deny is the default, and everything is logged.**

We shipped this as Upload Bridge, a small open-source tool: a local broker plus a browser extension. The agent requests a file upload over a local API; a native Windows 11 dialog shows the real file path, size, and destination field; nothing moves without a human click; every request, approval, and denial lands in an audit log. It has since grown one-pass form filling and a combined decision form where the human approves files and answers the agent's questions in a single native window. The pattern generalizes to any consequential action: submitting a form, sending a message, downloading a file, making a payment.

The point is not our implementation. The point is that the pattern is old, proven, and sitting right there.

## Why job applications are the preview

Hiring is where the agent trust crisis arrived first. Applicants use agents because applying is a volume game; employers face a flood of machine-generated applications and respond with AI-use policies, detection tools, and blunt bans. Some companies now require candidates to attest they used no AI at all. This is an arms race, and detection loses arms races.

Accountability wins them. An application produced through a consent layer is different in kind from bot spam: a human saw every substantive answer, approved every document, and made every commitment, and there is an audit trail that proves it. The applicant gets leverage without dishonesty. The employer gets what they actually wanted, a human accountable for the application, without pretending the tools do not exist. The same structure serves both sides, which is how you know it is infrastructure and not a hack.

What hiring is experiencing now, every other domain will experience next: procurement, customer service, banking, healthcare admin. Anywhere agents act and institutions need to know a human stands behind the action.

## Where this should live

A browser extension and a local broker are the right prototype and the wrong final home. Consent enforcement belongs where UAC lives: in the operating system and the browser, below the agent, unbypassable by design.

The OS vendors are closest to this. Windows already ships agentic features and already owns the trusted-UI primitives, secure desktop, consent prompts, per-application permissions. Extending that model to agent actions, with an OS-level "agent broker" any AI system must route consequential actions through, is a straight line from what exists today. Browsers hold the other half: the page boundary, where an agent's intent becomes an irreversible act.

Until the platforms pick this up, the pattern is implementable by anyone, today, in user space. Ours is a few hundred lines of Node and PowerShell, MIT licensed, with an MCP interface so any agent can use it, an OpenAPI spec so anything else can too, and the pattern written up as a small open protocol (the Consent Request Protocol) so that better implementations can replace ours. The implementation is disposable. The principle is not: **agents request, humans consent, consent binds to the true object, and the record survives.**

## The bigger shift: identity no longer implies intent

There is a deeper reason this layer is coming, whether or not anyone plans it. For thirty years, authentication has carried a silent second meaning. Proving who you are also proved that you meant it: if your credentials did something, you did it. Every fraud system, every terms-of-service, every court case leans on that assumption.

Agents end it. Your agent operates inside your sessions, with your cookies, as you. Everything it does is perfectly authenticated and says nothing about whether you knew. Authentication still answers who; it can no longer answer whether a human intended this. Some other layer has to, and that layer is consent: proof that a present human approved this specific action, bound to its true object.

We have run this experiment once already. When payment fraud forced the issue, European regulators did not demand stronger passwords. PSD2 demanded dynamic linking: authorization bound to the exact amount and the exact payee, shown to the human at the moment of approval. That is object-bound consent, required by law, for one category of action. What agents make necessary is the same requirement extended to everything they touch.

So the trust stack for the agentic era has three layers, not one: authentication says who, consent says a human meant it, and the audit trail proves what happened. We spent two decades teaching programs to ask permission and one decade teaching payments to bind approval to the transaction. Agents are new programs with old problems. We already know the answer; we just have to decide to build it where it belongs.

---

*Upload Bridge is open source: github.com/realitymatrix/upload-bridge. The origin story, including the refusal that started it, is in the commit history.*
