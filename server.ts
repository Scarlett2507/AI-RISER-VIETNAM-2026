import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy Google GenAI Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient Gemini Execution Helper with Multi-Model Fallback
async function callGeminiSafe(
  promptOrContents: string | any[],
  systemInstruction?: string,
  responseMimeType?: string
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  // Use recommended stable models prioritizing high-availability gemini-3.6-flash
  const models = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.7-flash"];
  for (const model of models) {
    try {
      const config: any = {};
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (systemInstruction) config.systemInstruction = systemInstruction;

      const response = await ai.models.generateContent({
        model,
        contents: promptOrContents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      // Gracefully try the next available model in the resilient fallback chain
      const isLast = model === models[models.length - 1];
      if (isLast) {
        console.warn(`All Gemini models encountered high demand or errors. Using intelligent local rule engine.`);
      }
    }
  }
  return null;
}

// Server-side Intelligent Heuristic Mapping Fallback
function isBannerOrDescriptionHeader(header: string): boolean {
  if (!header) return false;
  const h = header.trim().toLowerCase();
  return (
    h.includes('bộ dữ liệu kiểm thử') ||
    h.includes('full test cases') ||
    h.includes('chuẩn hóa sđt') ||
    h.includes('duplicate merge') ||
    h.includes('file chứa đầy đủ') ||
    h.includes('kịch bản lộn xộn') ||
    h.includes('danh sách chưa chuẩn hóa') ||
    h.includes('mẫu import') ||
    h.includes('lưu ý:') ||
    h.includes('hướng dẫn') ||
    h.includes('bảng tính tổng hợp') ||
    (header.length > 45 && (header.includes(':') || header.includes('(')))
  );
}

function getHeuristicColumnMappings(headers: string[], entityType: string) {
  const canonicalFields: Record<string, Array<{ key: string; aliases: string[]; transform: string }>> = {
    speaker: [
      { key: "fullName", aliases: ["họ tên", "hoten", "full name", "name", "tên", "diễn giả", "chuyên gia", "người trình bày", "họ & tên diễn giả", "họ & tên", "họ và tên diễn giả", "họ tên diễn giả", "báo cáo viên", "keynote speaker", "speaker", "tên diễn giả"], transform: "name_titlecase" },
      { key: "email", aliases: ["email", "e-mail", "mail", "email lh", "hòm thư", "thư điện tử", "mail liên hệ", "email liên hệ", "contact email", "email diễn giả", "địa chỉ mail"], transform: "email_lower" },
      { key: "phone", aliases: ["phone", "sđt", "sdt", "tel", "mobile", "điện thoại", "số đt", "contact phone", "số đt quốc tế & vn", "sđt quốc tế", "số đt quốc tế", "mobile phone", "hotline", "sđt liên hệ", "số liên hệ"], transform: "phone_vn" },
      { key: "organization", aliases: ["công ty", "đơn vị", "tổ chức", "company", "organization", "cơ quan", "doanh nghiệp", "đơn vị công tác", "đơn vị & chức vụ", "nơi công tác", "viện", "trường", "tổ chức / doanh nghiệp"], transform: "none" },
      { key: "role", aliases: ["chức vụ", "chức danh", "vị trí", "title", "position", "role", "job title", "vị trí / chức danh", "chức vụ / vị trí", "vị trí công tác"], transform: "none" },
      { key: "expertise", aliases: ["chuyên môn", "lĩnh vực", "expertise", "specialty", "ngành", "lĩnh vực chuyên môn", "chủ đề báo cáo", "chuyên ngành", "bài trình bày", "đề tài báo cáo", "chủ đề"], transform: "array_split" },
      { key: "bio", aliases: ["tiểu sử", "bio", "giới thiệu", "summary", "profile", "mô tả", "thông tin diễn giả", "giới thiệu diễn giả"], transform: "none" },
      { key: "rating", aliases: ["rating", "đánh giá", "điểm", "score", "sao", "điểm sao", "số sao", "đánh giá sao (rating)", "điểm đánh giá", "xếp hạng"], transform: "number" },
      { key: "location", aliases: ["khu vực", "thành phố", "location", "city", "tỉnh thành", "địa chỉ", "nơi ở", "quê quán"], transform: "none" },
      { key: "tags", aliases: ["bộ phận", "ban", "tags", "nhãn bộ phận", "phân loại ban", "phòng ban", "bộ phận phụ trách (tags)", "ban phụ trách", "nhóm phụ trách"], transform: "array_split" },
      { key: "note", aliases: ["ghi chú", "ghichu", "note", "notes", "lưu ý", "thông tin lỗi", "lỗi", "nhận xét", "cảnh báo", "comment"], transform: "none" },
    ],
    enterprise: [
      { key: "name", aliases: ["tên công ty", "tên doanh nghiệp", "doanh nghiệp", "đơn vị", "company name", "tổ chức", "tên đối tác", "tên đối tác tài trợ", "công ty", "đối tác", "nhà tài trợ", "đơn vị tài trợ", "tên tổ chức", "tên cty"], transform: "none" },
      { key: "industry", aliases: ["ngành nghề", "lĩnh vực", "industry", "sector", "lĩnh vực kinh doanh", "lĩnh vực hoạt động", "mảng kinh doanh", "ngành hoạt động", "mảng hoạt động"], transform: "none" },
      { key: "contactPerson", aliases: ["người liên hệ", "đại diện", "contact person", "người phụ trách", "pic", "người liên hệ hợp tác", "người đại diện", "đại diện liên hệ", "họ tên người liên hệ"], transform: "name_titlecase" },
      { key: "contactEmail", aliases: ["email", "email công ty", "mail liên hệ", "contact email", "email liên hệ", "hòm thư", "thư điện tử", "email người liên hệ", "địa chỉ mail"], transform: "email_lower" },
      { key: "contactPhone", aliases: ["sđt", "sdt", "phone", "hotline", "điện thoại", "số đt", "số điện thoại", "hotline / số điện thoại", "sđt liên hệ", "contact phone"], transform: "phone_vn" },
      { key: "tier", aliases: ["hạng", "tier", "cấp đối tác", "mức tài trợ", "phân hạng", "hạng tài trợ", "gói tài trợ", "hạng đối tác tài trợ", "sponsor tier", "sponsorship level", "package", "hạng đối tác", "loại tài trợ"], transform: "none" },
      { key: "sponsorshipTotal", aliases: ["số tiền tài trợ", "tiền tài trợ", "kinh phí tài trợ", "sponsorship", "sponsorship total", "sponsorship amount", "tổng tài trợ", "số tiền", "giá trị tài trợ", "hạn mức tài trợ", "tài trợ (vnd)", "tài trợ (đ)", "số tiền (vnd)", "mức đóng góp", "ngân sách tài trợ", "amount", "tiền", "gói tài trợ (vnd)", "tài trợ", "kinh phí", "tổng tiền tài trợ", "giá trị gói"], transform: "number" },
      { key: "scale", aliases: ["quy mô", "số nhân sự", "scale", "size", "quy mô nhân sự", "quy mô công ty", "số lượng nhân viên", "quy mô doanh nghiệp"], transform: "none" },
      { key: "website", aliases: ["web", "website", "trang web", "url", "cổng thông tin", "link web", "homepage"], transform: "none" },
      { key: "location", aliases: ["địa chỉ", "trụ sở", "location", "tỉnh thành", "khu vực", "trụ sở chính", "thành phố", "văn phòng chính"], transform: "none" },
      { key: "tags", aliases: ["bộ phận", "ban", "tags", "nhãn bộ phận", "phân loại ban", "phòng ban", "bộ phận phụ trách (tags)", "ban phụ trách", "ban đối ngoại"], transform: "array_split" },
      { key: "note", aliases: ["ghi chú", "ghichu", "note", "notes", "lưu ý", "thông tin lỗi", "lỗi", "nhận xét", "cảnh báo"], transform: "none" },
    ],
    guest: [
      { key: "fullName", aliases: ["họ tên", "hoten", "tên khách", "họ và tên", "full name", "guest name", "tên", "họ tên khách mời", "họ & tên", "tên đại biểu", "người tham dự", "khách mời"], transform: "name_titlecase" },
      { key: "email", aliases: ["email", "e-mail", "mail", "thư điện tử", "hòm thư đăng ký", "hòm thư", "email đăng ký", "email liên hệ", "contact email"], transform: "email_lower" },
      { key: "phone", aliases: ["sđt", "sdt", "phone", "mobile", "điện thoại", "số điện thoại", "số đt", "mobile phone", "sđt liên hệ", "contact phone"], transform: "phone_vn" },
      { key: "organization", aliases: ["công ty", "đơn vị", "cơ quan", "organization", "company", "cơ quan / đơn vị", "đơn vị công tác", "nơi công tác", "doanh nghiệp", "tổ chức"], transform: "none" },
      { key: "role", aliases: ["chức vụ", "vị trí", "job title", "role", "chức danh", "vị trí công tác", "chức danh công việc"], transform: "none" },
      { key: "ticketType", aliases: ["loại vé", "ticket", "phân loại vé", "hạng vé", "ticket type", "ticket tier", "pass", "hạng thẻ", "loại thẻ", "phân loại khách", "mức vé", "thẻ đại biểu", "hạng", "tier"], transform: "none" },
      { key: "interestTopics", aliases: ["chủ đề quan tâm", "chủ đề", "quan tâm", "mối quan tâm", "lĩnh vực quan tâm", "nội dung quan tâm", "interest", "topics", "interested topics", "nhu cầu", "chuyên đề", "lĩnh vực"], transform: "array_split" },
      { key: "location", aliases: ["tỉnh thành", "khu vực", "city", "location", "thành phố", "địa chỉ", "nơi ở"], transform: "none" },
      { key: "tags", aliases: ["bộ phận", "ban", "tags", "nhãn bộ phận", "phân loại ban", "bộ phận phụ trách (tags)", "ban phụ trách", "ban lễ tân"], transform: "array_split" },
      { key: "note", aliases: ["ghi chú", "ghichu", "note", "notes", "lưu ý", "thông tin lỗi", "lỗi", "nhận xét", "cảnh báo"], transform: "none" },
    ],
    event: [
      { key: "title", aliases: ["tên sự kiện", "tên chương trình", "event name", "title", "tên sk", "chương trình", "hội thảo"], transform: "none" },
      { key: "code", aliases: ["mã", "code", "event code", "mã sự kiện", "mã sk", "id sự kiện"], transform: "none" },
      { key: "date", aliases: ["ngày", "thời gian", "date", "ngày tổ chức", "thời gian tổ chức", "ngày diễn ra", "time"], transform: "none" },
      { key: "location", aliases: ["địa điểm", "nơi tổ chức", "location", "venue", "khu vực", "tỉnh thành", "hội trường"], transform: "none" },
      { key: "type", aliases: ["loại hình", "loại sự kiện", "type", "event type", "hình thức", "thể loại"], transform: "none" },
      { key: "theme", aliases: ["chủ đề", "theme", "topic", "lĩnh vực", "chuyên đề"], transform: "none" },
      { key: "attendeeCount", aliases: ["số lượng khách", "khách tham dự", "số khách", "số người", "quy mô", "attendees", "attendee count", "số lượng"], transform: "number" },
      { key: "budget", aliases: ["ngân sách", "chi phí", "kinh phí", "budget", "tổng ngân sách", "ngân sách dự kiến"], transform: "number" },
      { key: "status", aliases: ["trạng thái", "tình trạng", "status", "tiến độ"], transform: "none" },
      { key: "targetAudience", aliases: ["đối tượng", "target audience", "khách mục tiêu", "đối tượng tham gia"], transform: "none" },
      { key: "tags", aliases: ["bộ phận", "ban", "tags", "phân loại ban", "ban chủ trì", "nhóm phụ trách"], transform: "array_split" },
      { key: "note", aliases: ["ghi chú", "ghichu", "note", "notes", "lưu ý", "lỗi", "nhận xét"], transform: "none" },
      { key: "description", aliases: ["mô tả", "description", "nội dung", "tóm tắt", "giới thiệu"], transform: "none" },
    ],
  };

  const fieldList = canonicalFields[entityType] || canonicalFields.speaker;
  
  const stripVietnamese = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').trim();

  return headers.map(header => {
    // If this header is a banner or disclaimer text, discard it
    if (isBannerOrDescriptionHeader(header)) {
      return {
        sourceColumn: header,
        targetField: "",
        confidence: 0,
        reason: "Bỏ qua dòng tiêu đề banner / ghi chú bộ dữ liệu kiểm thử",
        suggestedTransform: "none",
      };
    }

    const cleanH = header.trim().toLowerCase();
    const strippedH = stripVietnamese(cleanH);
    let matchedField = "";
    let transform = "none";
    let confidence = 0;

    for (const f of fieldList) {
      const strippedKey = stripVietnamese(f.key);
      if (cleanH === f.key.toLowerCase() || strippedH === strippedKey) {
        matchedField = f.key;
        transform = f.transform;
        confidence = 98;
        break;
      }
      
      for (const a of f.aliases) {
        const strippedA = stripVietnamese(a);
        if (cleanH === a || strippedH === strippedA) {
          matchedField = f.key;
          transform = f.transform;
          confidence = 95;
          break;
        }
        if (cleanH.includes(a) || strippedH.includes(strippedA) || a.includes(cleanH) || strippedA.includes(strippedH)) {
          matchedField = f.key;
          transform = f.transform;
          confidence = 88;
          break;
        }
      }

      if (matchedField) break;
    }

    // Heuristic fallbacks by entity domain keywords
    if (!matchedField) {
      if (entityType === "guest") {
        if (/vé|ve|ticket|pass|hạng|hang/i.test(strippedH)) {
          matchedField = "ticketType";
          transform = "none";
          confidence = 85;
        } else if (/quan tam|interest|chu de|topic|linh vuc/i.test(strippedH)) {
          matchedField = "interestTopics";
          transform = "array_split";
          confidence = 85;
        }
      } else if (entityType === "enterprise") {
        if (/tai tro|sponsor|kinh phi|tien|so tien|amount|vnd/i.test(strippedH)) {
          matchedField = "sponsorshipTotal";
          transform = "number";
          confidence = 88;
        } else if (/hang|tier|goi|partner/i.test(strippedH)) {
          matchedField = "tier";
          transform = "none";
          confidence = 88;
        }
      }
    }

    return {
      sourceColumn: header,
      targetField: matchedField,
      confidence: confidence || (matchedField ? 85 : 0),
      reason: matchedField ? `Tự động nhận diện chuẩn xác theo từ khóa thực thể` : "Chưa xác định",
      suggestedTransform: transform,
    };
  });
}

// 1. Health check & Gemini status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. Gemini Smart Column Mapper with Fallback
app.post("/api/gemini/suggest-mapping", async (req, res) => {
  try {
    const { headers, sampleRows, entityType } = req.body;
    if (!headers || !Array.isArray(headers)) {
      return res.json({ success: true, mappings: [] });
    }

    const prompt = `Bạn là chuyên gia chuẩn hóa dữ liệu sự kiện tại Việt Nam.
Hãy phân tích danh sách các cột tiêu đề Excel sau đây cho đối tượng "${entityType}":
Các cột tiêu đề nguồn: ${JSON.stringify(headers)}
Mẫu 2 dòng dữ liệu đầu tiên: ${JSON.stringify(sampleRows || [])}

Hãy ánh xạ từng cột nguồn sang một trong các trường dữ liệu chuẩn sau:
- speaker: fullName, email, phone, organization, role, expertise, bio, rating, location, tags, note
- enterprise: name, industry, contactPerson, contactEmail, contactPhone, tier, sponsorshipTotal, scale, website, location, tags, note
- guest: fullName, email, phone, organization, role, ticketType, interestTopics, location, tags, note
- event: title, code, date, location, type, theme, targetAudience, description, tags, note

LƯU Ý CỰC KỲ QUAN TRỌNG:
1. Nếu phát hiện cột hoặc dòng nào là tiêu đề banner, ghi chú bộ dữ liệu (như 'BỘ DỮ LIỆU KIỂM THỬ TỔNG HỢP...', 'FULL TEST CASES...', 'File chứa đầy đủ kịch bản...', 'Lưu ý:...'), hãy ĐẶT targetField: "" (rỗng) và confidence: 0 để tự động bỏ qua, không ánh xạ vào dữ liệu thực thể.
2. Với các cột chứa Số tiền tài trợ / kinh phí / sponsorship / giá trị tài trợ (tiền VNĐ hoặc USD), ánh xạ sang "sponsorshipTotal" với suggestedTransform là "number".
3. Với các cột chứa Số điện thoại quốc tế (+1, +84, 84...), ánh xạ sang "phone" (hoặc "contactPhone") với suggestedTransform là "phone_vn".
4. Với các cột chứa nhiều email hoặc email dính, ánh xạ sang "email" (hoặc "contactEmail") với suggestedTransform là "email_lower".

Trả về kết quả ở định dạng JSON thuần túy (không kèm markdown):
{
  "mappings": [
    {
      "sourceColumn": "Tên cột gốc",
      "targetField": "trường chuẩn hoặc để rỗng nếu là tiêu đề banner/rác/không liên quan",
      "confidence": 95,
      "reason": "Giải thích ngắn gọn lý do ánh xạ",
      "suggestedTransform": "none" | "name_titlecase" | "phone_vn" | "email_lower" | "array_split"
    }
  ]
}`;

    const text = await callGeminiSafe(prompt, undefined, "application/json");
    if (text) {
      try {
        const result = JSON.parse(text);
        if (result && Array.isArray(result.mappings)) {
          return res.json({ success: true, ...result });
        }
      } catch (parseErr) {
        console.warn("Failed to parse Gemini JSON output, falling back to heuristic:", parseErr);
      }
    }

    // High quality fallback
    const fallbackMappings = getHeuristicColumnMappings(headers, entityType);
    res.json({
      success: true,
      mappings: fallbackMappings,
      isFallback: true,
    });
  } catch (error: any) {
    console.warn("Gemini mapping handler warning:", error?.message || error);
    const headers = req.body?.headers || [];
    const entityType = req.body?.entityType || 'speaker';
    res.json({
      success: true,
      mappings: getHeuristicColumnMappings(headers, entityType),
      isFallback: true,
    });
  }
});

// 3. Gemini Speaker-Event Matchmaker & Deep Reasoning
app.post("/api/gemini/matchmaker-reasoning", async (req, res) => {
  const { speaker, event } = req.body;
  try {
    const prompt = `Bạn là Giám đốc Nội dung Hội nghị cấp cao (Head of Content & Conference Producer).
Hãy đánh giá mức độ tương thích giữa Diễn giả và Sự kiện sau:

THÔNG TIN DIỄN GIẢ:
- Họ tên: ${speaker?.fullName}
- Chức danh: ${speaker?.role} tại ${speaker?.organization}
- Chuyên môn: ${Array.isArray(speaker?.expertise) ? speaker.expertise.join(", ") : speaker?.expertise}
- Tiểu sử: ${speaker?.bio || "Chưa cập nhật"}
- Đánh giá: ${speaker?.rating || 4.8}/5.0

THÔNG TIN SỰ KIỆN:
- Tên sự kiện: ${event?.title}
- Chủ đề/Lĩnh vực: ${event?.theme || event?.title}
- Đối tượng tham dự: ${event?.targetAudience || "Chuyên gia, Quản lý cấp cao"}
- Địa điểm: ${event?.location}
- Mô tả: ${event?.description || ""}

Hãy phân tích và trả về JSON:
{
  "score": (điểm số từ 50 đến 99),
  "matchHighlights": ["3 điểm tương thích nổi bật nhất"],
  "recommendedTopics": ["2 chủ đề bài nói/workshop được thiết kế riêng cho diễn giả tại sự kiện này"],
  "talkingPointsRationale": "1 đoạn văn giải thích lý do vì sao diễn giả này sẽ tạo sức hút lớn cho khán giả của sự kiện."
}`;

    const text = await callGeminiSafe(prompt, undefined, "application/json");
    if (text) {
      try {
        const result = JSON.parse(text);
        if (result && result.score) {
          return res.json({ success: true, ...result });
        }
      } catch (parseErr) {
        console.warn("Parse matchmaker output failed:", parseErr);
      }
    }
  } catch (error: any) {
    console.warn("Matchmaker reasoning warning:", error?.message || error);
  }

  // Graceful rule-based response
  res.json({
    success: true,
    score: 88,
    matchHighlights: [
      `Chuyên môn cốt lõi (${Array.isArray(speaker?.expertise) ? speaker.expertise.join(', ') : speaker?.expertise || 'Chuyên gia'}) phù hợp định hướng ${event?.theme || event?.title}`,
      `Kinh nghiệm thực tiễn phong phú từ tổ chức ${speaker?.organization || 'Doanh nghiệp'}`,
      `Độ uy tín cao và phản hồi xuất sắc từ người tham dự (${speaker?.rating || 4.8}/5.0)`,
    ],
    recommendedTopics: [
      `Kinh nghiệm thực tiễn: Ứng dụng công nghệ và giải pháp chuyển đổi số bền vững`,
      `Tọa đàm chuyên sâu: Xu hướng phát triển và bài học chiến lược 2026`,
    ],
    talkingPointsRationale: `${speaker?.fullName} giữ vai trò ${speaker?.role || 'Chuyên gia'} tại ${speaker?.organization || 'Đơn vị'}, sở hữu bề dày chuyên môn cao và là gương mặt phù hợp tạo sức lan tỏa cho ${event?.title}.`,
    isFallback: true,
  });
});

// 4. Gemini Bio & Profile Enricher
app.post("/api/gemini/enrich-profile", async (req, res) => {
  const { entity, entityType } = req.body;
  try {
    const prompt = `Bạn là biên tập viên truyền thông sự kiện chuyên nghiệp tại Việt Nam.
Hãy nâng cấp và làm giàu thông tin hồ sơ ${entityType} sau thành một bản tóm tắt tiểu sử hoặc giới thiệu đối tác chuyên nghiệp, chuẩn phong cách hội nghị quốc tế:
Dữ liệu gốc: ${JSON.stringify(entity)}

Trả về kết quả dạng JSON:
{
  "enrichedBio": "Tiểu sử/Mô tả chuyên nghiệp 3-4 câu xúc tích, trang trọng, làm nổi bật giá trị",
  "suggestedTags": ["5 nhãn phân loại chính xác, ngắn gọn"],
  "executiveHeadline": "Tiêu đề ấn tượng (ví dụ: Chuyên gia hàng đầu về AI & Chuyển đổi số)"
}`;

    const text = await callGeminiSafe(prompt, undefined, "application/json");
    if (text) {
      try {
        const result = JSON.parse(text);
        if (result && result.enrichedBio) {
          return res.json({ success: true, ...result });
        }
      } catch (parseErr) {
        console.warn("Parse enrich output failed:", parseErr);
      }
    }
  } catch (error: any) {
    console.warn("Enrich profile warning:", error?.message || error);
  }

  const name = entity?.fullName || entity?.name || 'Đối tác';
  const org = entity?.organization || entity?.industry || 'Tổ chức uy tín';
  const role = entity?.role || 'Chuyên gia';
  res.json({
    success: true,
    enrichedBio: `${name} hiện đang đảm nhiệm vai trò ${role} tại ${org}. Là nhân sự chủ chốt với nhiều đóng góp tích cực và bề dày kinh nghiệm hợp tác, kết nối trong các diễn đàn hội nghị quy mô lớn.`,
    suggestedTags: ['Chuyên gia', 'Lãnh đạo', 'Diễn giả tiêu biểu', 'Đối tác chiến lược'],
    executiveHeadline: `${role} | ${org}`,
    isFallback: true,
  });
});

// 5. Gemini Event Data Copilot (Chat & Query Assistant)
app.post("/api/gemini/copilot-chat", async (req, res) => {
  const { message, contextData, history } = req.body;
  try {
    const systemPrompt = `Bạn là Trợ Lý AI Chuyên Nghiệp của nền tảng Quản Lý & Chuẩn Hóa Dữ Liệu Sự Kiện EventData Hub.
Nhiệm vụ của bạn là trả lời các câu hỏi về diễn giả, doanh nghiệp, khách mời, nhà tài trợ, địa điểm tổ chức sự kiện và chiến lược nội dung dựa trên kho dữ liệu sự kiện được cung cấp dưới đây.

DỮ LIỆU TẬP TRUNG HIỆN CÓ TRONG HỆ THỐNG:
- Số lượng Diễn giả: ${contextData?.speakerCount || 0}
- Danh sách Diễn giả mẫu tiêu biểu: ${JSON.stringify(contextData?.speakersSample || [])}
- Số lượng Doanh nghiệp / Đối tác: ${contextData?.enterpriseCount || 0}
- Danh sách Doanh nghiệp mẫu: ${JSON.stringify(contextData?.enterprisesSample || [])}
- Số lượng Khách mời: ${contextData?.guestCount || 0}
- Danh sách Sự kiện: ${JSON.stringify(contextData?.eventsSample || [])}

Quy tắc:
1. Trả lời bằng tiếng Việt lịch thiệp, thông minh, ngắn gọn, dùng gạch đầu dòng rõ ràng.
2. Khi gợi ý diễn giả cho sự kiện, hãy nêu rõ họ tên, tổ chức, chuyên môn và lý do phù hợp.
3. Nếu người dùng hỏi về xuất dữ liệu hoặc tích hợp Google (Google Maps, Google Calendar, Google Sheets), hãy hướng dẫn họ sử dụng các nút tích hợp tiện ích sẵn có trên thanh công cụ.`;

    const chatContents: any[] = [];
    if (Array.isArray(history)) {
      history.forEach((h: any) => {
        chatContents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      });
    }
    chatContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const reply = await callGeminiSafe(chatContents, systemPrompt);
    if (reply) {
      return res.json({
        success: true,
        reply,
      });
    }
  } catch (error: any) {
    console.warn("Copilot chat warning:", error?.message || error);
  }

  res.json({
    success: true,
    reply: `Chào bạn! Tôi là Trợ lý AI EventData Hub (chế độ phản hồi nhanh). Trong cơ sở dữ liệu hiện có ${contextData?.speakerCount || 0} diễn giả, ${contextData?.enterpriseCount || 0} doanh nghiệp đối tác, và ${contextData?.eventCount || 0} sự kiện được chuẩn hóa. Bạn có thể sử dụng thanh tìm kiếm toàn cầu, lọc theo bộ phận hoặc mở module AI Copilot để tra cứu nhanh!`,
    isFallback: true,
  });
});

// Vite middleware for dev / static serve for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EventData Hub Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
