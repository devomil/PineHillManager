export default function TestCalendar() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Global Calendar - Test Page</h1>
      <p className="mt-4">This is a test to verify routing is working.</p>
      <div className="mt-6 space-y-4">
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">Lake Geneva Store</h2>
          <p>704 W Main St, Lake Geneva, Wisconsin 53147</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold">Watertown Store</h2>
          <p>200 W Main Street, Watertown, Wisconsin 53094</p>
        </div>
      </div>
    </div>
  );
}