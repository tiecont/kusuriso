import pg from 'pg'
import { config } from '../config/env.js'

const { Pool } = pg

export const pool = new Pool({ ...config.database, max: 10 })

const seedMedicines = [
  {
    id: '11111111-1111-4111-8111-111111111111', slug: 'paracetamol', name: 'Paracetamol', genericName: 'Acetaminophen',
    brands: ['Panadol', 'Hapacol'], category: 'Giảm đau · Hạ sốt',
    summary: 'Hoạt chất thường dùng để giảm đau nhẹ đến vừa và hạ sốt.',
    description: 'Paracetamol (còn gọi là acetaminophen) có tác dụng giảm đau và hạ sốt. Thuốc có mặt trong nhiều sản phẩm đơn thành phần hoặc phối hợp, vì vậy hãy kiểm tra hoạt chất trên nhãn trước khi dùng cùng lúc nhiều thuốc.',
    uses: 'Đau đầu, đau răng, đau cơ nhẹ và các tình trạng sốt. Nguyên nhân kéo dài hoặc triệu chứng nặng cần được nhân viên y tế đánh giá.',
    directions: 'Liều dùng phụ thuộc tuổi, cân nặng, dạng bào chế và tình trạng sức khỏe. Thực hiện theo tờ hướng dẫn hoặc chỉ định của bác sĩ; không tự tăng liều hay dùng trùng hoạt chất.',
    sideEffects: 'Có thể gây buồn nôn hoặc phát ban. Tổn thương gan nghiêm trọng có thể xảy ra khi dùng quá liều hoặc phối hợp nhiều sản phẩm chứa paracetamol.',
    warnings: 'Hỏi ý kiến nhân viên y tế nếu có bệnh gan, thường xuyên uống rượu, đang mang thai hoặc dùng thuốc khác. Quá liều cần được xử trí y tế khẩn cấp, kể cả khi chưa có triệu chứng.',
    imageUrl: null, featured: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222', slug: 'ibuprofen', name: 'Ibuprofen', genericName: 'Ibuprofen',
    brands: ['Advil', 'Nurofen'], category: 'Giảm đau · Kháng viêm',
    summary: 'Thuốc kháng viêm không steroid giúp giảm đau, viêm và sốt.',
    description: 'Ibuprofen thuộc nhóm thuốc kháng viêm không steroid (NSAID). Thuốc có thể giúp giảm đau và viêm, nhưng cũng có nguy cơ ảnh hưởng dạ dày, thận và tim mạch ở một số người.',
    uses: 'Đau cơ, đau răng, đau bụng kinh, một số tình trạng viêm và sốt. Cần chọn thuốc phù hợp với nguyên nhân và bệnh nền.',
    directions: 'Dùng theo nhãn sản phẩm hoặc chỉ định của nhân viên y tế, trong thời gian ngắn nhất cần thiết. Không phối hợp với NSAID khác nếu chưa được tư vấn.',
    sideEffects: 'Khó chịu dạ dày, buồn nôn, chóng mặt. Đi cấp cứu nếu có nôn ra máu, đi ngoài phân đen, khó thở hoặc sưng mặt.',
    warnings: 'Người có tiền sử loét/xuất huyết tiêu hóa, bệnh thận hoặc tim mạch, đang dùng thuốc chống đông, đang mang thai cần hỏi bác sĩ hoặc dược sĩ trước khi dùng.',
    imageUrl: null, featured: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333', slug: 'cetirizine', name: 'Cetirizine', genericName: 'Cetirizine hydrochloride',
    brands: ['Zyrtec'], category: 'Dị ứng',
    summary: 'Thuốc kháng histamine dùng cho một số triệu chứng dị ứng.',
    description: 'Cetirizine là thuốc kháng histamine thế hệ mới, thường được dùng để làm giảm triệu chứng viêm mũi dị ứng và mề đay. Mức độ buồn ngủ có thể khác nhau giữa mỗi người.',
    uses: 'Hắt hơi, chảy nước mũi, ngứa mắt do dị ứng và mề đay theo hướng dẫn trên nhãn hoặc chỉ định chuyên môn.',
    directions: 'Chọn dạng và liều theo độ tuổi, chức năng thận và nhãn sản phẩm. Không tự kết hợp với thuốc dị ứng khác.',
    sideEffects: 'Buồn ngủ, mệt mỏi, khô miệng hoặc chóng mặt. Tránh lái xe nếu thấy buồn ngủ hoặc phản ứng chậm.',
    warnings: 'Trao đổi với nhân viên y tế nếu có bệnh thận, đang mang thai/cho con bú, hoặc dự định dùng cho trẻ nhỏ. Hạn chế rượu và thuốc an thần.',
    imageUrl: null, featured: false,
  },
  {
    id: '44444444-4444-4444-8444-444444444444', slug: 'omeprazole', name: 'Omeprazole', genericName: 'Omeprazole',
    brands: ['Losec'], category: 'Tiêu hóa',
    summary: 'Thuốc giảm tiết acid dạ dày, thuộc nhóm ức chế bơm proton.',
    description: 'Omeprazole làm giảm lượng acid do dạ dày tiết ra. Thuốc được dùng trong một số bệnh lý liên quan đến acid, nhưng triệu chứng kéo dài cần được tìm nguyên nhân thay vì tự điều trị liên tục.',
    uses: 'Trào ngược dạ dày-thực quản, loét dạ dày-tá tràng và một số chỉ định khác theo đánh giá của bác sĩ.',
    directions: 'Dùng đúng thời điểm và thời gian được ghi trên nhãn hoặc đơn thuốc. Không nghiền hoặc nhai viên bao tan trong ruột nếu tờ hướng dẫn không cho phép.',
    sideEffects: 'Đau đầu, đau bụng, buồn nôn, tiêu chảy hoặc táo bón. Dùng kéo dài có thể cần được bác sĩ theo dõi.',
    warnings: 'Đi khám nếu khó nuốt, nôn ra máu, sụt cân không rõ nguyên nhân hoặc triệu chứng không cải thiện. Báo cho bác sĩ về các thuốc đang dùng.',
    imageUrl: null, featured: false,
  },
  {
    id: '55555555-5555-4555-8555-555555555555', slug: 'amoxicillin', name: 'Amoxicillin', genericName: 'Amoxicillin',
    brands: ['Amoxil'], category: 'Kháng sinh kê đơn',
    summary: 'Kháng sinh penicillin dùng điều trị một số nhiễm khuẩn theo đơn.',
    description: 'Amoxicillin là kháng sinh nhóm penicillin. Thuốc chỉ có tác dụng với một số bệnh nhiễm khuẩn và không điều trị cảm lạnh, cúm hay các bệnh do virus.',
    uses: 'Một số nhiễm khuẩn do vi khuẩn nhạy cảm, với chẩn đoán và phác đồ do bác sĩ đưa ra.',
    directions: 'Chỉ dùng khi có đơn. Làm theo đúng liều, khoảng cách và thời gian điều trị ghi trên đơn; không chia sẻ thuốc hoặc tự dùng lại đơn cũ.',
    sideEffects: 'Buồn nôn, tiêu chảy hoặc phát ban. Khó thở, sưng môi/mặt hoặc phát ban lan rộng có thể là phản ứng dị ứng nghiêm trọng cần cấp cứu.',
    warnings: 'Không dùng nếu từng dị ứng nghiêm trọng với penicillin trừ khi bác sĩ đánh giá lại. Báo cho bác sĩ về dị ứng thuốc và các thuốc khác đang dùng.',
    imageUrl: null, featured: true,
  },
  {
    id: '66666666-6666-4666-8666-666666666666', slug: 'metformin', name: 'Metformin', genericName: 'Metformin hydrochloride',
    brands: ['Glucophage'], category: 'Tiểu đường · Kê đơn',
    summary: 'Thuốc kê đơn thường dùng trong kiểm soát đái tháo đường type 2.',
    description: 'Metformin giúp kiểm soát đường huyết ở người mắc đái tháo đường type 2 và thường được dùng cùng điều chỉnh lối sống. Phác đồ cần cá thể hóa theo chức năng thận và tình trạng sức khỏe.',
    uses: 'Kiểm soát đường huyết trong đái tháo đường type 2 khi được bác sĩ chỉ định.',
    directions: 'Dùng theo đơn và đúng dạng bào chế. Không tự ngừng thuốc hoặc thay đổi liều; bác sĩ có thể yêu cầu xét nghiệm theo dõi.',
    sideEffects: 'Tiêu chảy, buồn nôn, khó chịu bụng hoặc thay đổi vị giác, thường rõ hơn khi mới bắt đầu.',
    warnings: 'Báo cho bác sĩ nếu có bệnh thận/gan, mất nước nặng hoặc chuẩn bị chụp chiếu có thuốc cản quang. Thở nhanh, yếu lả hoặc đau bụng bất thường cần được đánh giá khẩn cấp.',
    imageUrl: null, featured: false,
  },
]

export async function waitForDatabase(): Promise<void> {
  let connected = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await pool.query('SELECT 1')
      connected = true
      break
    } catch (error) {
      if (attempt === 29) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  if (!connected) throw new Error('Could not connect to PostgreSQL')

}

export async function checkDatabaseSchema(): Promise<void> {
  const { rows } = await pool.query<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
  if (rows[0]?.version !== 3) throw new Error('Database schema is missing or unsupported; run npm run db:migrate')
}

export async function migrateDatabase(): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicines (
      id UUID PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      generic_name TEXT NOT NULL DEFAULT '',
      brands TEXT[] NOT NULL DEFAULT '{}',
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      uses TEXT NOT NULL,
      directions TEXT NOT NULL,
      side_effects TEXT NOT NULL,
      warnings TEXT NOT NULL,
      image_url TEXT,
      featured BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query('INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING')
  await pool.query(`UPDATE medicines SET image_url = NULL
    WHERE id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666')
      AND image_url LIKE 'https://images.unsplash.com/%'`)
  await pool.query('INSERT INTO schema_migrations (version) VALUES (2) ON CONFLICT DO NOTHING')
  await pool.query('ALTER TABLE medicines ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false')
  await pool.query(`UPDATE medicines SET is_demo = true WHERE id IN
    ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
     '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444',
     '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666')`)
  await pool.query('INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT DO NOTHING')
}

export async function seedDatabase(): Promise<void> {
  for (const medicine of seedMedicines) {
    await pool.query(
      `INSERT INTO medicines (
        id, slug, name, generic_name, brands, category, summary, description,
        uses, directions, side_effects, warnings, image_url, featured, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      ON CONFLICT (slug) DO NOTHING`,
      [
        medicine.id, medicine.slug, medicine.name, medicine.genericName, medicine.brands,
        medicine.category, medicine.summary, medicine.description, medicine.uses,
        medicine.directions, medicine.sideEffects, medicine.warnings, medicine.imageUrl,
        medicine.featured,
      ],
    )
  }
}
