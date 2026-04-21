function formatName(name: string): string {
  // Remove special characters
  name = name.replace(/[."“”]/g, "");

  // Trim
  name = name.trim();

  // Normalize spaces
  name = name.replace(/\s+/g, " ");

  // Lowercase with Vietnamese locale
  name = name.toLocaleLowerCase("vi-VN");

  const dictionary: Record<string, string> = {
    van: "Văn",
    thi: "Thị",
    duc: "Đức",
    ngoc: "Ngọc",
  };

  // Capitalize each word
  return name
    .split(" ")
    .map((word) => {
      if (dictionary[word]) return dictionary[word];
      return word.charAt(0).toLocaleUpperCase("vi-VN") + word.slice(1);
    })
    .join(" ");
}
const inputs = [
  "Nguyễn  vAn Thanh",
  " trần   thị Nhung",
  "Huỳnh Thúc Điền.",
  "“Lê van  NaM”",
];

for (const name of inputs) {
  console.log(formatName(name));
}
