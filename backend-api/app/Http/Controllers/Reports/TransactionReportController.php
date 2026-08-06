<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Ledger\Money;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class TransactionReportController extends Controller
{
    use ApiResponse;

    /** Paginated, filterable ledger activity for the Transactions report. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => 'sometimes|string|max:50',
            'search' => 'sometimes|string|max:100',
            'start' => 'sometimes|date',
            'end' => 'sometimes|date',
        ]);

        $query = JournalEntry::query()->with('lines');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (! empty($validated['search'])) {
            $query->where('description', 'like', '%'.$validated['search'].'%');
        }

        if (! empty($validated['start'])) {
            $query->where('posted_at', '>=', now()->parse($validated['start'])->startOfDay());
        }

        if (! empty($validated['end'])) {
            $query->where('posted_at', '<=', now()->parse($validated['end'])->endOfDay());
        }

        $entries = $query->orderByDesc('posted_at')->paginate(50);

        $entries->getCollection()->transform(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'type' => $entry->type,
            'description' => $entry->description,
            'gateway' => $entry->gateway,
            'amount' => $entry->lines->reduce(
                fn ($carry, $line) => Money::add($carry, Money::sub((string) $line->credit, (string) $line->debit)),
                '0.00'
            ),
            'posted_at' => $entry->posted_at?->toDateTimeString(),
        ]);

        return $this->success($entries, 'Transaction report retrieved successfully.');
    }
}
