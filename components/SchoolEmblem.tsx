export default function SchoolEmblem({ small = false }: { small?: boolean }) {
  return <img src="/images/school-emblem.png" alt="江西师范高等专科学校校徽" className={`school-emblem${small ? " small" : ""}`} width={small ? 36 : 52} height={small ? 36 : 52} />;
}
