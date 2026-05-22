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
        analytics: "วิเคราะห์",
        graph: "กราฟ",
        sources: "แหล่งที่มา",
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

    explorer: {
        searchSkills: "ค้นหาสกิล, ปลั๊กอิน, แหล่งที่มา…",
        searchCommands: "ค้นหาคำสั่ง, ปลั๊กอิน, แหล่งที่มา…",
        tabAll: "ทั้งหมด",
        sortRecent: "อัปเดตล่าสุด",
        sortName: "ชื่อ (ก–ฮ)",
        sortUsage: "ใช้บ่อยที่สุด",
        colSkill: "สกิล",
        colCommand: "คำสั่ง",
        colType: "ประเภท",
        colScope: "ขอบเขต",
        colSource: "แหล่งที่มา",
        colUpdated: "อัปเดตล่าสุด",
        colUsed: "ใช้แล้ว",
        noSkillsMatch: "ไม่มีสกิลที่ตรงกับตัวกรอง",
        noCommandsMatch: "ไม่มีคำสั่งที่ตรงกับตัวกรอง",
        showingSkills: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} สกิล`,
        showingCommands: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} คำสั่ง`,
        emptySkills: (total) => `0 จาก ${total} สกิล`,
        emptyCommands: (total) => `0 จาก ${total} คำสั่ง`,
        pluginTitle: (name) => `ปลั๊กอิน: ${name}`,
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
        fromGitHub: "จาก GitHub",
        localOnly: "ในเครื่องเท่านั้น",
        totalCommands: "คำสั่งทั้งหมด",
        personal: "ส่วนตัว",
        project: "โปรเจ็กต์",
        notTrackedInGit: "ไม่ได้ติดตามใน git",
        availableEverywhere: "ใช้ได้ทุกที่",
        acrossLocations: (count) => `จาก ${count} ตำแหน่งที่สแกน`,
        pluginsInstalled: (count) => `ติดตั้งปลั๊กอิน ${count} รายการ`,
        pluginsShort: (count) => `${count} ปลั๊กอิน`,
        repositories: (count) => `${count} รีโพซิทอรี`,
        projectsCount: (count) => `${count} โปรเจ็กต์`,
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
        modelEnabled: "เปิดใช้งาน",
        modelDisabled: "ปิดใช้งาน (สแลชเท่านั้น)",
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
    },

    viewer: {
        preview: "ตัวอย่าง",
        raw: "ต้นฉบับ",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyRaw: (file) => `คัดลอก ${file} ต้นฉบับไปยังคลิปบอร์ด`,
    },
};
