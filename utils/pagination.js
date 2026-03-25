exports.getPagination = (page, limit) => {

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;

    const offset = (currentPage - 1) * perPage;

    return { currentPage, perPage, offset };
};