import type { Dictionary } from "./en";

/** Thai translations — must match the shape of the English dictionary exactly. */
export const th: Dictionary = {
    meta: {
        title: "Skills Lector",
        description: "เรียกดูและตรวจสอบ Claude Skills ที่ติดตั้งบนเครื่องนี้",
    },

    nav: {
        brand: "Skills Lector",
        skills: "สกิล",
        commands: "คำสั่ง",
        hooks: "ฮุก",
        analytics: "วิเคราะห์",
        graph: "กราฟ",
        sources: "แหล่งที่มา",
        usecase: "วิธีใช้",
        discover: "ค้นพบ",
    },

    language: {
        label: "ภาษา",
    },

    theme: {
        toLight: "สลับเป็นโหมดสว่าง",
        toDark: "สลับเป็นโหมดมืด",
    },

    actions: {
        rescan: "สแกนใหม่",
        scanning: "กำลังสแกน…",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyToClipboard: "คัดลอกไปยังคลิปบอร์ด",
        showMore: "แสดงเพิ่มเติม",
        showLess: "แสดงน้อยลง",
        previous: "ก่อนหน้า",
        next: "ถัดไป",
    },

    common: {
        never: "ไม่เคย",
        unknown: "ไม่ทราบ",
        justNow: "เมื่อสักครู่",
        loadingGraph: "กำลังโหลดกราฟ…",
        loadingPipeline: "กำลังโหลดไปป์ไลน์…",
        allProjects: "ทุกโปรเจ็กต์",
        filterByProject: "กรองตามโปรเจ็กต์",
        page: (current, total) => `หน้า ${current} จาก ${total}`,
    },

    skillTypes: {
        personal: "ส่วนตัว",
        plugin: "ปลั๊กอิน",
        project: "โปรเจ็กต์",
        local: "ในเครื่อง",
    },

    scan: {
        line: (date, ms, platform) => `สแกนเมื่อ ${date} · ${ms} ms · ${platform}`,
        transcripts: (date, count) =>
            `สแกนเมื่อ ${date} · ${count} ทรานสคริปต์`,
        errors: (count) => `มี ${count} พาธที่อ่านไม่ได้ระหว่างการสแกน`,
    },

    dashboard: {
        title: "สกิลที่ติดตั้ง",
        subtitle:
            "ทุก Claude Skill ที่พบบนเครื่องนี้ — อยู่ที่ไหน มาจากไหน และเปลี่ยนแปลงล่าสุดเมื่อใด",
        emptyTitle: "ไม่พบสกิล",
        empty1: "ไม่พบสิ่งใดภายใต้ ",
        empty2:
            " หรือตำแหน่งสแกนเริ่มต้นอื่น ๆ ชี้สแกนเนอร์ไปยังไดเรกทอรีโดยเพิ่มรายการ ",
        empty3: " ลงใน ",
        empty4: " แล้วกดสแกนใหม่",
    },

    commandsPage: {
        title: "คำสั่งที่ติดตั้ง",
        subtitle:
            "ทุกคำสั่งสแลช Claude Code ที่พบบนเครื่องนี้ — อยู่ที่ไหน มาจากไหน และเปลี่ยนแปลงล่าสุดเมื่อใด",
        emptyTitle: "ไม่พบคำสั่ง",
        empty1: "ไม่พบไฟล์ ",
        empty2: " ของคำสั่งสแลชภายใต้ ",
        empty3: ", ปลั๊กอินที่ติดตั้ง, หรือไดเรกทอรี ",
        empty4: " ของโปรเจ็กต์ที่รู้จัก เพิ่มไฟล์คำสั่งแล้วกดสแกนใหม่",
    },

    hooksPage: {
        title: "ฮุกที่ตั้งค่าไว้",
        subtitle:
            "ทุก hook ของ Claude Code ที่ประกาศบนเครื่องนี้ — รันใน lifecycle event ใด ใช้คำสั่งอะไร และประกาศไว้ในไฟล์ settings ใด",
        emptyTitle: "ไม่มี hook ที่ตั้งค่าไว้",
        empty1: "ไม่พบรายการ ",
        empty2: " ในไฟล์ settings ส่วนตัว ",
        empty3: ", settings ของปลั๊กอิน, หรือไฟล์ ",
        empty4: " ของโปรเจ็กต์ที่รู้จัก ตั้งค่า hook ผ่านเมนู /hooks ของ Claude Code (หรือแก้ settings.json ด้วยมือ) แล้วกดสแกนใหม่",
        unnamedMatcher: "(ใด ๆ)",
        exampleHeading: "เริ่มต้นเร็ว — ลองตัวอย่างนี้",
        exampleIntro:
            "ตัวอย่าง 5 hook ครอบคลุมทุกหมวดที่ stat cards ด้านบนนับ คัดลอก JSON แล้ววางลงในไฟล์ settings อันใดอันหนึ่งข้างล่าง จากนั้นกดสแกนใหม่",
        exampleCopyLabel: "ตัวอย่าง settings.json",
        exampleInstallPersonal: "ส่วนตัว (ทุกเซสชัน): ",
        exampleInstallProject: "โปรเจ็กต์ (commit ได้): ",
        exampleInstallLocal: "โปรเจ็กต์ในเครื่อง (git-ignored): ",
    },

    discoverPage: {
        title: "ค้นหาสกิลยอดนิยม",
        subtitle:
            "รีโพ Claude-Skills ยอดนิยมบน GitHub จัดอันดับตามจำนวนดาว รายการสร้างโดยสกิล discover-popular-skills ของ Claude Code และอ่านจากไฟล์ manifest ในเครื่อง — เว็บแอปไม่ได้เรียกออกเครือข่ายเลย",
        emptyTitle: "ยังไม่เคยรันการค้นพบ",
        empty1: "รันคำสั่งสแลช ",
        empty2: " ใน Claude Code (หรือเรียกสกิล ",
        empty3: ") เพื่อค้นหารีโพ Claude-Skills ที่ได้รับความนิยมที่สุดบน GitHub ผลลัพธ์อันดับ 10 อันดับแรกจะถูกบันทึกที่ ",
        empty4: " ที่รูตของรีโพ และปรากฏที่นี่",
        meta: {
            discoveredAt: "ค้นพบเมื่อ",
            auth: "การยืนยันตัวตน",
            queries: "คำค้นหา",
            entries: (count) => `${count} รีโพที่จัดอันดับ`,
            authGh: "GitHub CLI (gh)",
            authAnonymous: "fetch แบบไม่ยืนยันตัวตน",
        },
        rateLimited:
            "GitHub จำกัดอัตราการเรียกอย่างน้อยหนึ่งคำค้นในการรันครั้งนี้ — การจัดอันดับอาจไม่ครบ ลอง gh auth login แล้วรัน /discover-skills อีกครั้ง",
        readErrors: "ไม่สามารถ parse manifest ได้ครบถ้วน:",
        colRank: "#",
        colRepo: "รีโพซิทอรี",
        colStars: "ดาว",
        colTopics: "หัวข้อ",
        colStatus: "สถานะ",
        badgeVendored: "วางใน vendor แล้ว",
        badgeNotVendored: "ยังไม่ได้วางใน vendor",
        openRepo: "เปิดบน GitHub",
        vendoredHint: (p) => `Submodule ที่ ${p}`,
        actionsHeading: "ขั้นตอนถัดไป",
        actionsBody:
            "เลือกรีโพข้างบน แล้วเพิ่มเป็น git submodule จาก Claude Code จากนั้นติดตั้งสกิลของรีโพนั้นลงใน ~/.claude/skills/:",
        cmdClone: "/discover-skills clone <repo-name>",
        cmdInstall: "/vendor-install <skill-name>",
        refreshHeading: "รีเฟรชการจัดอันดับ",
        refreshBody:
            "จำนวนดาวเปลี่ยนได้ รัน discover ใหม่เมื่อใดก็ได้เพื่อเขียนทับ manifest ด้วย top 10 ใหม่:",
        cmdSearch: "/discover-skills",
    },

    usecasePage: {
        title: "เริ่มต้นใช้งาน Skills Lector",
        subtitle:
            "Claude Skills และคำสั่งสแลชคืออะไร อยู่ที่ไหน และจะใช้ Skills Lector จัดการมันอย่างไร",
        tocTitle: "ในหน้านี้",
        toc: {
            concepts: "แนวคิด",
            locations: "อยู่ที่ไหน",
            catalogTour: "อ่าน Skills Lector",
            examples: "ตัวอย่างใช้งาน",
            faq: "คำถามที่พบบ่อย",
        },
        concepts: {
            heading: "แนวคิด",
            body: `**Claude Skills** และ **คำสั่งสแลช** เป็นสองวิธีในการสอน Claude Code ให้รู้จักเวิร์กโฟลว์ที่นำกลับมาใช้ได้ ทั้งคู่เป็นไฟล์ข้อความธรรมดาบนดิสก์ของคุณ และทั้งคู่คือสิ่งที่ Skills Lector สแกนหา

**Claude Skill** คือไดเรกทอรีที่มีไฟล์ \`SKILL.md\` ภายใน frontmatter จะประกาศ \`name\` และ \`description\` ของสกิล ส่วนเนื้อหาจะอธิบายว่า *เมื่อใด* ควรใช้และ *อย่างไร* Claude อ่าน description แล้วตัดสินใจเองว่าคำขอของผู้ใช้ตรงกับสกิลนี้หรือไม่ — นี่เรียกว่า **model invocation** สกิลยังสามารถระบุ \`disable-model-invocation: true\` เพื่อให้เรียกผ่านคำสั่งสแลชเท่านั้น

**คำสั่งสแลช** คือไฟล์ \`.md\` เดี่ยวภายใต้ไดเรกทอรี \`commands/\` คุณเรียกใช้อย่างชัดเจนด้วยการพิมพ์ \`/<ชื่อ>\` ใน Claude Code frontmatter สามารถระบุ \`description\`, \`argument-hint\`, และ \`allowed-tools\` ได้ ส่วนเนื้อหาจะกลายเป็น prompt ของเทิร์นนั้น — \`$ARGUMENTS\` จะถูกแทนที่ด้วยสิ่งที่ผู้ใช้พิมพ์หลังเครื่องหมายสแลช

**ความแตกต่างหลักคือใครเป็นผู้เรียกใช้** Claude เลือกสกิลจากบริบทเอง ส่วนคุณเลือกคำสั่งโดยการพิมพ์ ทั้งคู่สามารถมาพร้อมสิทธิ์และเครื่องมือ และทั้งคู่สามารถอยู่ในขอบเขต personal, plugin, project, หรือ local ได้`,
        },
        locations: {
            heading: "อยู่ที่ไหน",
            body: `Skills Lector สแกนสี่ขอบเขตสำหรับสิ่งของแต่ละประเภท ขอบเขตคือสิ่งที่ป้าย **Type** บนทุกแถวบอกคุณ

| ขอบเขต | พาธสกิล | พาธคำสั่ง | หมายเหตุ |
|---|---|---|---|
| **personal** | \`~/.claude/skills/<ชื่อ>/SKILL.md\` | \`~/.claude/commands/<ชื่อ>.md\` | ใช้ได้ในทุกเซสชัน Claude Code |
| **plugin** | \`~/.claude/plugins/.../skills/...\` | \`~/.claude/plugins/.../commands/...\` | รวมมากับปลั๊กอินที่ติดตั้ง |
| **project** | \`<repo>/.claude/skills/<ชื่อ>/SKILL.md\` | \`<repo>/.claude/commands/<ชื่อ>.md\` | จำกัดในโปรเจ็กต์ มักคอมมิตเข้าโปรเจ็กต์ |
| **local** | \`sample-skills/\` ที่มากับแอปนี้ | — | ตัวอย่างที่มาด้วย ทำให้แดชบอร์ดไม่ว่าง |

คุณสามารถชี้สแกนเนอร์ไปยังไดเรกทอรีเพิ่มเติมได้ด้วย \`skills-lector.config.json\` ที่วางคู่กับตำแหน่งที่รัน dev server หรือใช้ตัวแปรสภาพแวดล้อม \`SKILLS_SCAN_ROOTS\` ดูตำแหน่งทั้งหมดที่กำลังสแกนอยู่ได้ที่หน้า **Sources**`,
        },
        catalogTour: {
            heading: "อ่าน Skills Lector",
            body: `Skills Lector มีห้ามุมมอง สร้างจากการสแกนเดียวกันทั้งหมด ไม่มีมุมมองใดเรียกออกเครือข่าย — ทุกอย่างอ่านจากดิสก์ของคุณ

- **Skills** (\`/\`) — ทุก \`SKILL.md\` ที่พบ พร้อมการค้นหา ตัวกรอง และหน้ารายละเอียดที่เรนเดอร์เนื้อหา markdown และบอกแหล่งที่มาของไฟล์
- **Commands** (\`/commands\`) — ทุกคำสั่งสแลชที่พบ พร้อมความสามารถค้นหา/กรอง/จัดเรียงแบบเดียวกัน หน้ารายละเอียดแสดงรูปแบบการเรียก frontmatter และเนื้อหาทั้งหมด
- **Analytics** (\`/analytic\`) — สกิลและคำสั่งที่คุณใช้จริง สร้างขึ้นใหม่จากทรานสคริปต์เซสชัน Claude Code ของคุณ มีประโยชน์ในการหาสิ่งที่คุณลืมว่าติดตั้งไว้
- **Graph** (\`/graph\`) — สกิล คำสั่ง และปลั๊กอินหรือโปรเจ็กต์ที่บรรจุพวกมันเชื่อมโยงกันอย่างไร ฮับคือหน่วยที่บรรจุ ส่วนเส้นแสดงการอ้างอิงระหว่างสิ่งของ
- **Sources** (\`/sources\`) — ต้นทางของแต่ละสกิล: มาจากรีโพ GitHub ปลั๊กอิน หรือไดเรกทอรีในเครื่อง พร้อมตารางของรูตที่สแกนทุกตำแหน่งบนเครื่องนี้

ปุ่ม **Rescan** ที่มุมขวาบนรันทั้งสองการสแกนอีกครั้งและรีเฟรชทุกมุมมอง`,
        },
        examples: {
            heading: "ตัวอย่างใช้งาน",
            intro:
                "สี่งานที่ทำได้ทันทีวันนี้ ตั้งแต่ไม่ต้องเขียนโค้ดเลย (ติดตั้ง) ไปจนถึงเขียนสกิลหรือคำสั่งขั้นต่ำเอง",
            installVendor: {
                heading: "1. ติดตั้งสกิลจาก vendor",
                body: `รีโพนี้เก็บสกิลจากภายนอกเป็น **git submodule ภายใต้ \`vendor/\`** คำสั่งสแลช \`/vendor-install\` (อยู่ใน \`.claude/commands/\` ของรีโพนี้) ใช้ติดตั้งสกิลใดสกิลหนึ่งเข้าไปยังไดเรกทอรีสกิลส่วนตัวของคุณ ซึ่ง Claude Code จะตรวจพบ

รันโดยไม่ใส่อาร์กิวเมนต์เพื่อดูรายการที่มี:`,
                listInvocation: "/vendor-install",
                installInvocation: "/vendor-install debug-mantra",
                after: `เลือกชื่อสกิลจากรายการแล้วส่งเป็นอาร์กิวเมนต์ ค่าเริ่มต้นจะคัดลอกสกิลเข้า \`~/.claude/skills/\` (ขอบเขต personal ใช้ได้ทุกที่) ส่งคำว่า \`project\` เป็นอาร์กิวเมนต์ที่สองเพื่อติดตั้งเข้า \`.claude/skills/\` ของรีโพปัจจุบันแทน

เมื่อติดตั้งเสร็จ กด **Rescan** ที่หัว Skills Lector — สกิลใหม่จะปรากฏในมุมมอง Skills`,
            },
            authorSkill: {
                heading: "2. เขียนสกิลของคุณเอง",
                body: `สกิลขั้นต่ำคือไดเรกทอรีที่มีไฟล์เดียว สร้าง \`~/.claude/skills/<ชื่อ>/SKILL.md\` แล้ววาง:`,
                sampleLabel: "SKILL.md",
                sample: `---
name: greet-user
description: Greet the user warmly by name when they say hello, hi, or otherwise open a conversation. Use this at the start of a new session or when the user explicitly asks to be greeted.
---

# Greet User

When the user opens a conversation with a greeting (hello, hi, hey, สวัสดี, …), respond with a warm one-line greeting that uses their name if you know it, and then ask what they would like to work on.

Do **not** trigger this skill mid-conversation — only on the opening turn or when the user explicitly asks for a greeting.`,
                after: `ฟิลด์ \`description\` คือสิ่งที่ Claude อ่านเพื่อตัดสินใจ *เมื่อใด* จะเรียกใช้สกิล — ระบุวลีทริกเกอร์ให้เฉพาะเจาะจง ส่วนเนื้อหาคือสิ่งที่ Claude ทำตามเมื่อเลือกใช้แล้ว กด **Rescan** แล้วสกิลใหม่จะปรากฏใต้ขอบเขต **Personal**`,
            },
            authorCommand: {
                heading: "3. เขียนคำสั่งสแลช",
                body: `คำสั่งสแลชคือไฟล์เดี่ยว สร้าง \`~/.claude/commands/<ชื่อ>.md\` สำหรับคำสั่งส่วนตัว หรือ \`<repo>/.claude/commands/<ชื่อ>.md\` สำหรับคำสั่งระดับโปรเจ็กต์:`,
                sampleLabel: "explain.md",
                sample: `---
description: Explain a function, file, or concept in this codebase in plain language.
argument-hint: "[function-name|file-path|concept]"
allowed-tools: Read, Grep, Glob
---

Explain **$ARGUMENTS** in plain language. Cover:

1. What it does, in one sentence.
2. Where it is used in this codebase (use Grep / Glob).
3. Any non-obvious behaviour or edge cases worth knowing.

Keep the explanation tight — three short paragraphs at most.`,
                after: `ชื่อไฟล์จะกลายเป็นชื่อคำสั่ง: \`explain.md\` → \`/explain\` ไดเรกทอรีย่อยจะกลายเป็นเนมสเปซด้วย \`:\` เช่น \`docs/api.md\` คือ \`/docs:api\` \`$ARGUMENTS\` จะถูกแทนที่ด้วยสิ่งที่ตามหลังการเรียกสแลช ใช้ \`allowed-tools\` เพื่อประกาศว่าคำสั่งได้รับอนุญาตให้เรียกเครื่องมือของ Claude Code ตัวใดบ้าง`,
            },
            discover: {
                heading: "4. หาสกิลยอดนิยมเพื่อติดตั้ง",
                body: `หากยังไม่ทราบว่าควรติดตั้งสกิลใดดี หน้า \`/discover\` ที่กำลังจะมา และคำสั่ง \`/discover-skills\` ของ Claude Code จะจัดอันดับรีโพ Claude-Skills ที่ได้รับความนิยมที่สุดบน GitHub แล้วให้คุณโคลนเข้า \`vendor/\` ได้โดยตรง

ฟีเจอร์นี้จะมาใน **v0.3.0** — จนกว่าจะมา ให้ดูไดเรกทอรี \`vendor/\` ของรีโพนี้สำหรับชุดสกิลที่คัดมาให้แล้ว และใช้ขั้นตอน **ติดตั้งสกิลจาก vendor** ข้างบน`,
            },
        },
        faq: {
            heading: "คำถามที่พบบ่อย",
            items: [
                {
                    q: "เพิ่มสกิลแล้ว Skills Lector ไม่แสดง เพราะอะไร",
                    a: "การสแกนถูกแคชไว้ 8 วินาที และหน้าเว็บเรนเดอร์ครั้งเดียวต่อคำขอ กด **Rescan** ที่มุมขวาบนเพื่อบังคับให้สแกนสกิลและคำสั่งใหม่ทั้งคู่ ถ้ายังไม่ปรากฏ ตรวจสอบว่าไฟล์อยู่ในขอบเขตใดขอบเขตหนึ่งที่อธิบายไว้ในหัวข้อ **อยู่ที่ไหน** และชื่อไดเรกทอรีตรงกับชื่อสกิลใน frontmatter",
                },
                {
                    q: "สกิลกับคำสั่งสแลชต่างกันอย่างไร",
                    a: "**ใครเป็นผู้เรียก** คำสั่งสแลชเรียกโดย *คุณ* พิมพ์ \`/<ชื่อ>\` ส่วนสกิลเรียกโดย *Claude* เมื่อคำขอของผู้ใช้ตรงกับ \`description\` ของสกิล ทั้งคู่สามารถมาพร้อมเครื่องมือและ prompt ความแตกต่างคือทริกเกอร์",
                },
                {
                    q: "Skills Lector ส่งข้อมูลออกเครือข่ายไหม",
                    a: "ไม่ส่ง Skills Lector อ่านไฟล์จากดิสก์ของคุณและเรนเดอร์ในเบราว์เซอร์ ไม่มีการเรียก HTTP ออกข้างนอก — หน้า **Sources** เชื่อมโยงไป GitHub แต่ผ่านแท็ก anchor ธรรมดาที่คุณคลิกเอง ฟีเจอร์ discover ใน **v0.3.0** จะเรียก GitHub แต่จากในสกิล Claude Code เท่านั้น ไม่ใช่จากตัว Skills Lector",
                },
                {
                    q: "ถ้า SKILL.md มี frontmatter ผิดรูปแบบจะเป็นอย่างไร",
                    a: "สแกนเนอร์ออกแบบมาให้ผ่อนปรนโดยตั้งใจ มันพยายามกู้ \`name\` และ \`description\` แม้จาก YAML ที่ผิดรูปแบบ และพาธใดที่อ่านไม่ได้เลยจะถูกรายงานในกล่อง **errors** ที่ด้านล่างของหน้า ไม่ใช่ทำให้การสแกนล้ม",
                },
                {
                    q: "จะหยุดไม่ให้ Claude เรียกสกิลเองอย่างไร",
                    a: "เพิ่ม \`disable-model-invocation: true\` ใน frontmatter ของสกิล หรือใช้คำสั่ง \`/set-model-invocation\` หากติดตั้งไว้ สกิลจะรันเฉพาะตอนที่คุณเรียกผ่านคำสั่งสแลชที่อ้างถึงมันเท่านั้น",
                },
            ],
        },
    },

    explorer: {
        searchSkills: "ค้นหาสกิล, ปลั๊กอิน, แหล่งที่มา…",
        searchCommands: "ค้นหาคำสั่ง, ปลั๊กอิน, แหล่งที่มา…",
        searchHooks: "ค้นหา event, matcher, คำสั่ง…",
        tabAll: "ทั้งหมด",
        sortRecent: "อัปเดตล่าสุด",
        sortName: "ชื่อ (ก–ฮ)",
        sortEvent: "Event (A–Z)",
        sortUsage: "ใช้บ่อยที่สุด",
        colSkill: "สกิล",
        colCommand: "คำสั่ง",
        colHookCommand: "คำสั่ง",
        colEvent: "Event",
        colMatcher: "Matcher",
        colType: "ประเภท",
        colScope: "ขอบเขต",
        colSource: "แหล่งที่มา",
        colSourceFile: "ไฟล์แหล่งที่มา",
        colUpdated: "อัปเดตล่าสุด",
        colUsed: "ใช้แล้ว",
        colInvocation: "การเรียกใช้",
        noSkillsMatch: "ไม่มีสกิลที่ตรงกับตัวกรอง",
        noCommandsMatch: "ไม่มีคำสั่งที่ตรงกับตัวกรอง",
        noHooksMatch: "ไม่มี hook ที่ตรงกับตัวกรอง",
        showingSkills: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} สกิล`,
        showingCommands: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} คำสั่ง`,
        showingHooks: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} hook`,
        emptySkills: (total) => `0 จาก ${total} สกิล`,
        emptyCommands: (total) => `0 จาก ${total} คำสั่ง`,
        emptyHooks: (total) => `0 จาก ${total} hook`,
        pluginTitle: (name) => `ปลั๊กอิน: ${name}`,
        filterInvocation: "กรองตามการเรียกใช้",
        invocationAll: "การเรียกใช้ทั้งหมด",
        invocationModel: "โมเดลเรียกได้",
        invocationSlashOnly: "สแลชเท่านั้น",
        invocationModelHint:
            "โมเดลเรียกได้ — Claude เรียกใช้เองได้อัตโนมัติ ไม่ต้องพิมพ์คำสั่งสแลช",
        invocationSlashOnlyHint: "สแลชเท่านั้น — Claude จะไม่เรียกใช้เอง",
        filterEvent: "กรองตาม event",
        allEvents: "ทุก event",
    },

    sidebar: {
        allSkills: "สกิลทั้งหมด",
        allCommands: "คำสั่งทั้งหมด",
        filterSkills: "กรองสกิล…",
        filterCommands: "กรองคำสั่ง…",
        filterSkillsAria: "กรองสกิล",
        filterCommandsAria: "กรองคำสั่ง",
        noSkillsMatch: "ไม่มีสกิลที่ตรงกับตัวกรอง",
        noCommandsMatch: "ไม่มีคำสั่งที่ตรงกับตัวกรอง",
    },

    stats: {
        totalSkills: "สกิลทั้งหมด",
        fromPlugins: "จากปลั๊กอิน",
        totalCommands: "คำสั่งทั้งหมด",
        totalHooks: "Hook ทั้งหมด",
        preToolUseCount: "PreToolUse",
        postToolUseCount: "PostToolUse",
        sessionEventsCount: "Event เซสชัน",
        preToolUseSub: "ก่อนเครื่องมือทำงาน",
        postToolUseSub: "หลังเครื่องมือทำงาน",
        sessionEventsSub: "start, stop, prompt, …",
        modelInvocableSub: "Claude เรียกใช้เองได้",
        slashOnlySub: "เรียกผ่านสแลชเท่านั้น",
        acrossLocations: (count) => `จาก ${count} ตำแหน่งที่สแกน`,
        acrossSettingsFiles: (count) => `จาก ${count} ไฟล์ settings`,
        pluginsInstalled: (count) => `ติดตั้งปลั๊กอิน ${count} รายการ`,
        pluginsShort: (count) => `${count} ปลั๊กอิน`,
    },

    analyticsPage: {
        title: "วิเคราะห์การใช้งาน",
        subtitle:
            "สกิลและคำสั่งใดที่คุณใช้งานจริง — และอันใดที่คุณลืมไปแล้ว สร้างขึ้นใหม่จากทรานสคริปต์เซสชัน Claude Code ของคุณ",
        empty:
            "ยังไม่พบการเรียกใช้สกิลหรือคำสั่งในทรานสคริปต์เซสชันใด ๆ ลองใช้สกิลและคำสั่งสแลชใน Claude Code สักสองสามครั้ง แล้วกดสแกนใหม่",
    },

    analytics: {
        windows: {
            "4h": { label: "4 ชั่วโมง", long: "4 ชั่วโมงที่ผ่านมา" },
            "1d": { label: "24 ชั่วโมง", long: "24 ชั่วโมงที่ผ่านมา" },
            "1w": { label: "7 วัน", long: "7 วันที่ผ่านมา" },
            all: { label: "ทั้งหมด", long: "ประวัติทั้งหมดที่บันทึกไว้" },
        },
        trackedInvocations: "การเรียกใช้ที่บันทึกไว้",
        neverUsed: "ไม่เคยใช้",
        idle: "ไม่ได้ใช้ 7+ วัน",
        catalogCoverage: "ความครอบคลุมแคตตาล็อก",
        noActivityYet: "ยังไม่มีกิจกรรมที่บันทึกไว้",
        acrossTranscripts: (count) => `จาก ${count} ทรานสคริปต์`,
        skillsCommandsBreakdown: (skills, commands) =>
            `${skills} สกิล · ${commands} คำสั่ง`,
        coverageSub: (used, total) => `เรียกใช้แล้ว ${used}/${total}`,
        mostUsed: "ใช้บ่อยที่สุด",
        invocationsIn: (count, windowLong) =>
            `${count} การเรียกใช้ใน ${windowLong}`,
        topSkills: "สกิลยอดนิยม",
        topCommands: "คำสั่งยอดนิยม",
        noSkillsIn: (windowLong) => `ไม่มีสกิลที่ใช้ใน ${windowLong}`,
        noCommandsIn: (windowLong) => `ไม่มีคำสั่งที่ใช้ใน ${windowLong}`,
        activityHeatmap: "ฮีตแมปกิจกรรม",
        lastDays: (count) => `${count} วันล่าสุด`,
        skills: "สกิล",
        commands: "คำสั่ง",
        noSkillActivity: (count) => `ไม่มีกิจกรรมสกิลใน ${count} วันล่าสุด`,
        noCommandActivity: (count) => `ไม่มีกิจกรรมคำสั่งใน ${count} วันล่าสุด`,
        noActivity: (count) => `ไม่มีกิจกรรมใน ${count} วันล่าสุด`,
        reminders: "การแจ้งเตือน",
        remindersSub: "สกิลและคำสั่งที่ควรกลับไปดูอีกครั้ง",
        neverUsedEmpty: "สกิลและคำสั่งที่ติดตั้งทุกตัวถูกใช้อย่างน้อยหนึ่งครั้งแล้ว",
        idleEmpty: "ไม่มีอะไรที่ห่างหาย — ทุกอย่างถูกใช้เมื่อเร็ว ๆ นี้",
        lastUsedTooltip: (label) => `ใช้ล่าสุด ${label}`,
        fromSourceTooltip: (source) => `จาก ${source}`,
        heatLess: "น้อย",
        heatMore: "มาก",
        heatCell: (name, day, count) => `${name} — ${day}: ${count} ครั้ง`,
    },

    graphPage: {
        title: "กราฟความสัมพันธ์",
        subtitle:
            "สกิลและคำสั่งที่ติดตั้งของคุณเชื่อมโยงกันอย่างไร — จัดกลุ่มรอบปลั๊กอินหรือโปรเจ็กต์ที่รวมไว้ และเชื่อมโยงทุกที่ที่อันหนึ่งอ้างถึงอีกอันหนึ่ง วางเมาส์บนโหนดเพื่อดูการเชื่อมต่อ คลิกเพื่อเปิด",
        emptyTitle: "ยังไม่มีอะไรให้วาดกราฟ",
        empty1:
            "ไม่พบสกิลหรือคำสั่ง จึงไม่มีความสัมพันธ์ให้วาด ติดตั้งสกิลหรือเพิ่มไฟล์คำสั่ง แล้วกด ",
        empty2: "",
        statsLine: (skills, commands, clusters, references) =>
            `${skills} สกิล · ${commands} คำสั่ง · ${clusters} คลัสเตอร์ · ${references} การอ้างอิง`,
    },

    graph: {
        all: "ทั้งหมด",
        skills: "สกิล",
        commands: "คำสั่ง",
        legend: "คำอธิบาย",
        bundledTogether: "รวมอยู่ด้วยกัน",
        references: "การอ้างอิง",
        hubMeta: (kind, count) => `${kind} · ${count} รายการ`,
        referencesBadge: (count) => `เชื่อมโยงกับอีก ${count} รายการ`,
    },

    sources: {
        title: "แหล่งที่มา",
        subtitle:
            "สกิลที่ติดตั้งของคุณมาจากไหน — รีโพซิทอรี GitHub, ปลั๊กอิน, และไดเรกทอรีในเครื่อง",
        kinds: {
            github: "GitHub",
            git: "Git รีโมต",
            local: "ไดเรกทอรีในเครื่อง",
            plugin: "ปลั๊กอิน",
        },
        openRepository: "เปิดรีโพซิทอรี",
        skillCount: (count) => `${count} สกิล`,
        noSources: "ไม่พบแหล่งที่มา",
        scanLocations: "ตำแหน่งที่สแกน",
        scanLocationsDesc1:
            "ไดเรกทอรีที่แคตตาล็อกเดินสำรวจเพื่อค้นหาไฟล์ SKILL.md กำหนดรูตเพิ่มเติมได้ใน ",
        scanLocationsDesc2: "",
        colLocation: "ตำแหน่ง",
        colPath: "พาธ",
        colType: "ประเภท",
        colSkills: "สกิล",
        rootLabel: (key, arg) => {
            switch (key) {
                case "personalSkills":
                    return "สกิลส่วนตัว";
                case "installedPlugins":
                    return "ปลั๊กอินที่ติดตั้ง";
                case "coworkSkills":
                    return "สกิล Agent / Cowork";
                case "sampleSkills":
                    return "สกิลตัวอย่างที่มากับแอป";
                case "customRoot":
                    return "รูตที่กำหนดเอง";
                case "personalCommands":
                    return "คำสั่งส่วนตัว";
                case "personalSettings":
                    return "Settings ส่วนตัว";
                case "projectSettings":
                    return `Settings ของโปรเจ็กต์: ${arg ?? ""}`;
                case "projectLocalSettings":
                    return `Settings เฉพาะเครื่องของโปรเจ็กต์: ${arg ?? ""}`;
                case "project":
                    return `โปรเจ็กต์: ${arg ?? ""}`;
                case "plugin":
                    return `ปลั๊กอิน: ${arg ?? ""}`;
            }
        },
        rootKinds: {
            personal: "ส่วนตัว",
            plugin: "ปลั๊กอิน",
            project: "โปรเจ็กต์",
            local: "ในเครื่อง",
            auto: "อัตโนมัติ",
        },
    },

    detail: {
        lastModified: "แก้ไขล่าสุด",
        source: "แหล่งที่มา",
        branch: "แบรนช์",
        lastCommit: "คอมมิตล่าสุด",
        files: "ไฟล์",
        size: "ขนาด",
        used: "การใช้งาน",
        lastUsed: "ใช้ล่าสุด",
        allowedTools: "เครื่องมือที่อนุญาต",
        name: "ชื่อ",
        version: "เวอร์ชัน",
        author: "ผู้เขียน",
        namespace: "เนมสเปซ",
        argumentHint: "คำใบ้อาร์กิวเมนต์",
        model: "โมเดล",
        modelInvocation: "การเรียกใช้โดยโมเดล",
        modelInvocationHint:
            "รันคำสั่ง /model-invocation ใน Claude Code เพื่อเปลี่ยนค่านี้:",
        modelInvocationEnable: "เปิด — ให้ Claude เรียกใช้เองอัตโนมัติ",
        modelInvocationDisable: "ปิด — ให้เรียกผ่านสแลชเท่านั้น",
        pipeline: "ไปป์ไลน์",
        workflowSteps: "ขั้นตอนเวิร์กโฟลว์",
        sectionOutline: "โครงร่างหัวข้อ",
        details: "รายละเอียด",
        plugin: "ปลั๊กอิน",
        project: "โปรเจ็กต์",
        locationOnDisk: "ตำแหน่งบนดิสก์",
        skillNoBody: "ไฟล์ SKILL.md นี้ไม่มีเนื้อหา",
        skillUnreadable: "ไม่สามารถอ่านไฟล์ SKILL.md นี้ได้",
        commandNoBody: "ไฟล์คำสั่งนี้ไม่มีเนื้อหา",
        commandUnreadable: "ไม่สามารถอ่านไฟล์คำสั่งนี้ได้",
        usedTimes: (count) => `${count}×`,
        event: "Event",
        matcher: "Matcher",
        matcherAny: "ใด ๆ",
        command: "คำสั่ง",
        commandType: "ประเภท",
        timeout: "Timeout",
        timeoutSeconds: (s) => `${s} วินาที`,
        sourceFile: "ไฟล์ Settings",
        sourceFileSize: "ขนาดไฟล์",
    },

    viewer: {
        preview: "ตัวอย่าง",
        raw: "ต้นฉบับ",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyRaw: (file) => `คัดลอก ${file} ต้นฉบับไปยังคลิปบอร์ด`,
    },
};
