import fs from "fs";
const dataset = [];

// ===== helper =====
function add(text, label) {
    dataset.push({ text, label });
}

// ===== base data =====
const consult = [
    "tôi cần vợt nhẹ",
    "vợt nào dễ đánh",
    "gợi ý vợt cho người mới",
    "con nào đánh công tốt",
    "vợt nào ổn áp",
    "recommend vợt",
    "vợt nào ngon",
    "có vợt nhẹ không",
    "tư vấn giúp tôi",
    "vợt nào đáng mua"
];

const sql = [
    "giá bao nhiêu",
    "còn hàng không",
    "bao nhiêu tiền",
    "price bao nhiêu",
    "còn không",
    "hết hàng chưa",
    "giá hiện tại",
    "trong kho còn không",
    "bao nhiêu cái",
    "còn mấy cái"
];

const policy = [
    "có bảo hành không",
    "đổi trả như nào",
    "ship bao lâu",
    "free ship không",
    "phí ship bao nhiêu",
    "có hoàn tiền không",
    "giao hàng mấy ngày",
    "shop ship toàn quốc không"
];

const decision = [
    "mua luôn",
    "đặt hàng",
    "thêm vào giỏ",
    "order cái này",
    "cancel đơn",
    "hủy đơn",
    "chốt đơn",
    "lấy luôn"
];

// ===== biến thể =====
const prefixes = ["", "shop ơi ", "ad ơi ", "bro ", "pls "];
const suffixes = ["", " vậy", " với", " nha", " đi", " k", " không"];
const typos = [
    t => t,
    t => t.replace("vợt", "vot"),
    t => t.replace("không", "k"),
    t => t.replace("bao nhiêu", "bn"),
    t => t.replace("giá", "gia")
];

// ===== generate =====
function generateGroup(base, label) {
    base.forEach(text => {
        prefixes.forEach(p => {
            suffixes.forEach(s => {
                typos.forEach(fn => {
                    add(p + fn(text) + s, label);
                });
            });
        });
    });
}

generateGroup(consult, "consult");
generateGroup(sql, "sql");
generateGroup(policy, "policy");
generateGroup(decision, "decision");

// ===== multi-intent =====
add("vợt này giá bao nhiêu và có tốt không", ["sql", "consult"]);
add("còn hàng không và mua được không", ["sql", "decision"]);
add("có bảo hành không nếu mua", ["policy", "decision"]);
add("tôi muốn mua nhưng còn hàng không", ["decision", "sql"]);

// ===== shuffle =====
dataset.sort(() => Math.random() - 0.5);

// ===== save =====
fs.writeFileSync(
    "billshop_intent_1000.json",
    JSON.stringify(dataset.slice(0, 1000), null, 2),
    "utf-8"
);

console.log("✅ Created billshop_intent_1000.json with 1000 samples");